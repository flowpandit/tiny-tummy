use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use printpdf::{
    graphics::{Line, LinePoint, PaintMode, Point, Rect, WindingOrder},
    ops::PdfFontHandle,
    BuiltinFont, Color, Mm, Op, PdfDocument, PdfPage, PdfSaveOptions, Pt, RawImage, Rgb, TextItem,
    XObjectTransform,
};
use serde::Deserialize;

const PAGE_WIDTH_MM: f32 = 210.0;
const PAGE_HEIGHT_MM: f32 = 297.0;
const MARGIN_LEFT_MM: f32 = 16.0;
const MARGIN_RIGHT_MM: f32 = 16.0;
const MARGIN_TOP_MM: f32 = 16.0;
const MARGIN_BOTTOM_MM: f32 = 16.0;
const CONTENT_WIDTH_MM: f32 = PAGE_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPdfPayload {
    pub title: String,
    pub subtitle: String,
    pub child_name: String,
    pub child_meta: String,
    #[serde(default)]
    pub child_avatar_color: Option<String>,
    #[serde(default)]
    pub child_avatar_data_url: Option<String>,
    pub generated_at_label: String,
    pub patient_summary: String,
    pub attention_chips: Vec<ReportPdfChip>,
    pub dashboard_stats: Vec<ReportPdfStat>,
    pub summary_cards: Vec<ReportPdfSummaryCard>,
    pub charts: Vec<ReportPdfChart>,
    pub context_sections: Vec<ReportPdfSection>,
    pub timeline: Vec<ReportPdfTimelineRow>,
}

#[derive(Debug, Deserialize)]
pub struct ReportPdfStat {
    pub label: String,
    pub value: String,
    pub detail: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReportPdfChip {
    pub tone: String,
    pub text: String,
    pub detail: String,
}

#[derive(Debug, Deserialize)]
pub struct ReportPdfSummaryCard {
    pub title: String,
    pub value: String,
    pub detail: String,
    pub tone: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPdfChart {
    pub title: String,
    pub kind: String,
    pub primary_label: String,
    pub secondary_label: Option<String>,
    pub points: Vec<ReportPdfChartPoint>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPdfChartPoint {
    pub label: String,
    pub primary_value: i64,
    pub secondary_value: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPdfSection {
    pub title: String,
    pub empty_text: String,
    pub rows: Vec<ReportPdfSectionRow>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPdfSectionRow {
    pub title: String,
    pub meta: Option<String>,
    pub detail: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPdfTimelineRow {
    pub date_time: String,
    pub event_type: String,
    pub details: String,
    pub note: Option<String>,
}

pub fn generate_report_pdf(payload: ReportPdfPayload) -> Result<String, String> {
    let mut layout = PdfLayout::new(&payload.title);

    layout.draw_page_one(&payload)?;
    layout.new_page();
    layout.draw_page_two(&payload)?;

    layout.new_page();
    layout.draw_page_three(&payload)?;

    if !payload.timeline.is_empty() {
        layout.new_page();
        layout.draw_appendix_pages(&payload.timeline)?;
    }

    let bytes = layout.finish();
    Ok(STANDARD.encode(bytes))
}

struct PdfLayout {
    doc: PdfDocument,
    pages: Vec<PdfPage>,
    ops: Vec<Op>,
    y_mm: f32,
}

struct ReportOverviewItem {
    label: String,
    value: String,
    detail: String,
}

struct ReportInsightItem {
    title: String,
    value: String,
    detail: String,
    tone: String,
}

struct AtAGlanceRow {
    category: String,
    value: String,
    note: String,
}

impl PdfLayout {
    fn new(title: &str) -> Self {
        Self {
            doc: PdfDocument::new(title),
            pages: Vec::new(),
            ops: page_background_ops(),
            y_mm: MARGIN_TOP_MM,
        }
    }

    fn finish(mut self) -> Vec<u8> {
        self.finish_page();

        for (index, page) in self.pages.iter_mut().enumerate() {
            page.ops.extend(footer_ops(index + 1));
        }

        self.doc.with_pages(self.pages);
        let mut warnings = Vec::new();
        self.doc.save(&PdfSaveOptions::default(), &mut warnings)
    }

    fn finish_page(&mut self) {
        if self.ops.is_empty() {
            return;
        }

        let ops = std::mem::take(&mut self.ops);
        self.pages
            .push(PdfPage::new(Mm(PAGE_WIDTH_MM), Mm(PAGE_HEIGHT_MM), ops));
    }

    fn new_page(&mut self) {
        self.finish_page();
        self.ops = page_background_ops();
        self.y_mm = MARGIN_TOP_MM;
    }

    fn ensure_space(&mut self, height_mm: f32) {
        if self.y_mm + height_mm > PAGE_HEIGHT_MM - MARGIN_BOTTOM_MM {
            self.new_page();
        }
    }

    fn add_gap(&mut self, gap_mm: f32) {
        self.y_mm += gap_mm;
    }

    fn draw_page_one(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        self.draw_page_one_summary(payload)?;
        Ok(())
    }

    fn draw_page_two(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let is_tummy_report = payload.title.contains("Poop & Tummy");
        self.draw_compact_page_header(
            payload,
            if is_tummy_report {
                "Poop + Diaper Patterns"
            } else {
                "Daily Overview + Domain Trends"
            },
            if is_tummy_report {
                "Daily stool output, diaper output, and tummy pattern signals for the selected period."
            } else {
                "Daily stool output, feed activity, and pattern signals for the selected period."
            },
        );

        if !payload.charts.is_empty() {
            self.draw_chart_panel(&payload.charts)?;
            self.add_gap(7.0);
        } else {
            self.draw_empty_panel("No chartable daily activity was logged in this date range.")?;
        }

        self.draw_at_a_glance_table(payload)?;

        Ok(())
    }

    fn draw_page_three(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let is_tummy_report = payload.title.contains("Poop & Tummy");
        self.draw_compact_page_header(
            payload,
            if is_tummy_report {
                "Tummy Context"
            } else {
                "Clinical Context"
            },
            if is_tummy_report {
                "Symptoms, episodes, feeding context, diaper output, and safety notes from the same report period."
            } else {
                "Feeding, growth, symptom, episode, and milestone context from the same report period."
            },
        );

        self.draw_attention_notes(&payload.attention_chips)?;

        for section in &payload.context_sections {
            self.draw_context_section(section)?;
            self.add_gap(4.0);
        }

        if payload.context_sections.is_empty() {
            self.draw_empty_panel(
                "No additional clinical context sections were selected or logged for this period.",
            )?;
        }

        Ok(())
    }

    fn draw_appendix_pages(&mut self, timeline: &[ReportPdfTimelineRow]) -> Result<(), String> {
        self.draw_section_heading("Clinical Timeline Appendix")?;
        self.draw_wrapped_text(
            "Chronological log for clinical review. Columns: Date/Time, Event, Details, Parent Note.",
            MARGIN_LEFT_MM,
            CONTENT_WIDTH_MM,
            9.0,
            BuiltinFont::Helvetica,
            color_muted(),
            3.0,
        )?;

        self.draw_timeline_header();
        let mut zebra = false;

        for row in timeline {
            self.draw_timeline_row(row, zebra)?;
            zebra = !zebra;
        }

        Ok(())
    }

    fn draw_page_one_summary(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        self.draw_cover_hero(payload)?;
        self.add_gap(6.0);
        self.draw_overview_tiles(payload)?;
        self.add_gap(6.0);
        self.draw_insight_cards(payload)?;
        Ok(())
    }

    fn draw_cover_hero(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let y = self.y_mm;
        let height = 80.0;
        self.ensure_space(height);
        self.draw_rounded_rect(
            MARGIN_LEFT_MM,
            y,
            CONTENT_WIDTH_MM,
            height,
            4.8,
            color_warm_panel(),
        );
        self.draw_ellipse(
            MARGIN_LEFT_MM + CONTENT_WIDTH_MM - 22.0,
            y + 30.0,
            30.0,
            24.0,
            rgb(1.0, 0.918, 0.860),
        );
        self.draw_circle(
            MARGIN_LEFT_MM + CONTENT_WIDTH_MM - 56.0,
            y + 29.0,
            1.3,
            color_peach(),
        );
        self.draw_circle(
            MARGIN_LEFT_MM + CONTENT_WIDTH_MM - 18.0,
            y + 18.0,
            1.0,
            color_peach(),
        );

        self.draw_logo_mark(MARGIN_LEFT_MM + 6.0, y + 7.0, 10.5);
        self.draw_wrapped_text_at(
            "Tiny Tummy",
            MARGIN_LEFT_MM + 20.0,
            y + 10.4,
            48.0,
            10.0,
            BuiltinFont::HelveticaBold,
            rgb(0.25, 0.18, 0.15),
        );

        let (cover_line_one, cover_line_two) = cover_title_lines(&payload.title);

        self.draw_wrapped_text_at(
            &cover_line_one,
            MARGIN_LEFT_MM + 6.0,
            y + 26.0,
            98.0,
            26.0,
            BuiltinFont::HelveticaBold,
            color_ink(),
        );
        self.draw_wrapped_text_at(
            &cover_line_two,
            MARGIN_LEFT_MM + 6.0,
            y + 38.0,
            94.0,
            26.0,
            BuiltinFont::HelveticaBold,
            color_ink(),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&payload.child_name),
            MARGIN_LEFT_MM + 6.0,
            y + 54.0,
            78.0,
            15.5,
            BuiltinFont::HelveticaBold,
            color_peach_text(),
        );
        let child_meta = patient_detail_line(payload);

        self.draw_wrapped_text_at(
            &sanitize_text(&child_meta),
            MARGIN_LEFT_MM + 6.0,
            y + 62.5,
            82.0,
            8.8,
            BuiltinFont::Helvetica,
            color_body(),
        );

        self.draw_wrapped_text_at(
            "Report period",
            MARGIN_LEFT_MM + 6.0,
            y + 70.8,
            40.0,
            7.2,
            BuiltinFont::Helvetica,
            gray(0.42),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&payload.subtitle),
            MARGIN_LEFT_MM + 6.0,
            y + 75.3,
            70.0,
            7.8,
            BuiltinFont::Helvetica,
            color_body(),
        );
        self.draw_wrapped_text_at(
            "Generated",
            MARGIN_LEFT_MM + 70.0,
            y + 70.8,
            34.0,
            7.2,
            BuiltinFont::Helvetica,
            gray(0.42),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(
                &payload
                    .generated_at_label
                    .replace("Generated by Tiny Tummy | ", ""),
            ),
            MARGIN_LEFT_MM + 70.0,
            y + 75.3,
            48.0,
            7.8,
            BuiltinFont::Helvetica,
            color_body(),
        );

        let portrait_x = MARGIN_LEFT_MM + 122.0;
        let portrait_y = y + 20.0;
        self.draw_child_avatar(payload, portrait_x + 25.0, portrait_y + 25.0, 24.0);

        self.y_mm += height;
        Ok(())
    }

    fn draw_overview_tiles(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let items = build_overview_items(payload);
        if items.is_empty() {
            return Ok(());
        }

        let visible = items.len().min(6);
        let label_height = 8.0;
        let columns = 3usize;
        let rows = (visible + columns - 1) / columns;
        let gap = 4.0;
        let card_height = 25.5;
        let card_width = (CONTENT_WIDTH_MM - gap * (columns - 1) as f32) / columns as f32;
        let total_height =
            label_height + rows as f32 * card_height + rows.saturating_sub(1) as f32 * gap;
        self.ensure_space(total_height);

        self.draw_section_label("Executive overview", self.y_mm);
        let card_y = self.y_mm + label_height;

        for (index, item) in items.iter().take(visible).enumerate() {
            let row = index / columns;
            let col = index % columns;
            let x = MARGIN_LEFT_MM + col as f32 * (card_width + gap);
            let y = card_y + row as f32 * (card_height + gap);
            self.draw_card(x, y, card_width, card_height, Some(color_surface()));
            self.draw_wrapped_text_at(
                &sanitize_text(&item.label),
                x + 4.0,
                y + 3.6,
                card_width - 8.0,
                7.4,
                BuiltinFont::HelveticaBold,
                color_body(),
            );
            let value_font_size = overview_value_font_size(&item.value);
            self.draw_wrapped_text_at(
                &sanitize_text(&item.value),
                x + 4.0,
                y + 10.8,
                card_width - 8.0,
                value_font_size,
                BuiltinFont::HelveticaBold,
                color_ink(),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&truncate_text(&item.detail, 58)),
                x + 4.0,
                y + 19.8,
                card_width - 8.0,
                7.1,
                BuiltinFont::Helvetica,
                color_muted(),
            );
        }

        self.y_mm += total_height;
        Ok(())
    }

    fn draw_insight_cards(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let items = build_insight_items(payload);
        if items.is_empty() {
            return Ok(());
        }

        let visible = items.len().min(4);
        let label_height = 8.0;
        let card_height = 30.5;
        let columns = 2usize;
        let rows = (visible + columns - 1) / columns;
        let gap = 4.0;
        let card_width = (CONTENT_WIDTH_MM - gap) / columns as f32;
        let total_height =
            label_height + rows as f32 * card_height + rows.saturating_sub(1) as f32 * gap;
        self.ensure_space(total_height);

        self.draw_section_label("Key insights", self.y_mm);
        let card_y = self.y_mm + label_height;
        for (index, card) in items.iter().take(visible).enumerate() {
            let row = index / columns;
            let col = index % columns;
            let x = MARGIN_LEFT_MM + col as f32 * (card_width + gap);
            let y = card_y + row as f32 * (card_height + gap);
            self.draw_card(x, y, card_width, card_height, Some(tone_fill(&card.tone)));
            self.draw_wrapped_text_at(
                &sanitize_text(&card.title),
                x + 3.0,
                y + 3.8,
                card_width - 6.0,
                7.5,
                BuiltinFont::HelveticaBold,
                tone_text(&card.tone),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&card.value),
                x + 3.0,
                y + 10.8,
                card_width - 9.0,
                insight_value_font_size(&card.value),
                BuiltinFont::HelveticaBold,
                color_ink(),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&truncate_text(&card.detail, 108)),
                x + 3.0,
                y + 18.7,
                card_width - 9.0,
                7.5,
                BuiltinFont::Helvetica,
                color_body(),
            );
        }

        self.y_mm += total_height;
        Ok(())
    }

    fn draw_compact_page_header(
        &mut self,
        payload: &ReportPdfPayload,
        title: &str,
        subtitle: &str,
    ) {
        self.draw_logo_mark(MARGIN_LEFT_MM, self.y_mm, 7.0);
        self.draw_wrapped_text_at(
            "Tiny Tummy",
            MARGIN_LEFT_MM + 10.0,
            self.y_mm + 2.3,
            45.0,
            7.0,
            BuiltinFont::HelveticaBold,
            color_body(),
        );
        self.draw_wrapped_text_at(
            &format!("Report period: {}", sanitize_text(&payload.subtitle)),
            MARGIN_LEFT_MM,
            PAGE_HEIGHT_MM - 18.0,
            80.0,
            6.8,
            BuiltinFont::Helvetica,
            color_muted(),
        );
        self.y_mm += 14.0;
        self.draw_wrapped_text_at(
            title,
            MARGIN_LEFT_MM,
            self.y_mm,
            CONTENT_WIDTH_MM,
            15.0,
            BuiltinFont::HelveticaBold,
            color_ink(),
        );
        self.draw_wrapped_text_at(
            subtitle,
            MARGIN_LEFT_MM,
            self.y_mm + 7.0,
            CONTENT_WIDTH_MM,
            8.0,
            BuiltinFont::Helvetica,
            color_muted(),
        );
        self.y_mm += 17.0;
    }

    fn draw_chart_panel(&mut self, charts: &[ReportPdfChart]) -> Result<(), String> {
        let visible = charts.len().min(4);
        if visible == 0 {
            return Ok(());
        }

        let columns = 2usize;
        let gap = 4.0;
        let chart_width = (CONTENT_WIDTH_MM - gap) / columns as f32;
        let chart_height = 60.0;
        let rows = (visible + columns - 1) / columns;
        let total_height = rows as f32 * chart_height + rows.saturating_sub(1) as f32 * gap;
        self.ensure_space(total_height);

        for (index, chart) in charts.iter().take(visible).enumerate() {
            let row = index / columns;
            let col = index % columns;
            let x = MARGIN_LEFT_MM + col as f32 * (chart_width + gap);
            let y = self.y_mm + row as f32 * (chart_height + gap);
            self.draw_chart_card(chart, x, y, chart_width, chart_height)?;
        }

        self.y_mm += total_height;
        Ok(())
    }

    fn draw_empty_panel(&mut self, text: &str) -> Result<(), String> {
        let height = 24.0;
        self.ensure_space(height);
        self.draw_card(
            MARGIN_LEFT_MM,
            self.y_mm,
            CONTENT_WIDTH_MM,
            height,
            Some(color_surface()),
        );
        self.draw_wrapped_text_at(
            text,
            MARGIN_LEFT_MM + 5.0,
            self.y_mm + 8.0,
            CONTENT_WIDTH_MM - 10.0,
            9.0,
            BuiltinFont::Helvetica,
            color_muted(),
        );
        self.y_mm += height;
        Ok(())
    }

    fn draw_at_a_glance_table(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let rows = build_at_a_glance_rows(payload);
        if rows.is_empty() {
            return Ok(());
        }

        let visible = rows.len().min(8);
        let label_height = 8.0;
        let header_height = 9.2;
        let row_heights: Vec<f32> = rows
            .iter()
            .take(visible)
            .map(|row| {
                let note = truncate_text(&row.note, 84);
                let category_height = line_block_height(&row.category, 44.0, 7.4);
                let value_height = line_block_height(&row.value, 42.0, 7.4);
                let note_height = line_block_height(&note, 72.0, 7.4);
                (category_height.max(value_height).max(note_height) + 5.0).max(12.0)
            })
            .collect();
        let rows_height = row_heights.iter().sum::<f32>();
        let total_height = label_height + header_height + rows_height;
        self.ensure_space(total_height);

        self.draw_section_label("At-a-glance table", self.y_mm);
        let table_y = self.y_mm + label_height;
        self.draw_card(
            MARGIN_LEFT_MM,
            table_y,
            CONTENT_WIDTH_MM,
            header_height + rows_height,
            Some(color_surface()),
        );
        self.draw_filled_rect(
            MARGIN_LEFT_MM + 0.3,
            table_y + 0.3,
            CONTENT_WIDTH_MM - 0.6,
            header_height,
            color_table_header(),
        );
        self.draw_wrapped_text_at(
            "Category",
            MARGIN_LEFT_MM + 4.0,
            table_y + 3.0,
            42.0,
            7.5,
            BuiltinFont::HelveticaBold,
            color_body(),
        );
        self.draw_wrapped_text_at(
            "Period value",
            MARGIN_LEFT_MM + 55.0,
            table_y + 3.0,
            42.0,
            7.5,
            BuiltinFont::HelveticaBold,
            color_body(),
        );
        self.draw_wrapped_text_at(
            "Clinical note",
            MARGIN_LEFT_MM + 101.0,
            table_y + 3.0,
            72.0,
            7.5,
            BuiltinFont::HelveticaBold,
            color_body(),
        );

        let mut y = table_y + header_height;
        for (index, row) in rows.iter().take(visible).enumerate() {
            let row_height = row_heights[index];
            let note = truncate_text(&row.note, 84);
            let category_height = line_block_height(&row.category, 44.0, 7.4);
            let value_height = line_block_height(&row.value, 42.0, 7.4);
            let note_height = line_block_height(&note, 72.0, 7.4);
            let centered_y = |block_height: f32| y + ((row_height - block_height) / 2.0).max(2.0);
            if index % 2 == 1 {
                self.draw_filled_rect(
                    MARGIN_LEFT_MM + 0.3,
                    y,
                    CONTENT_WIDTH_MM - 0.6,
                    row_height,
                    color_zebra(),
                );
            }
            self.draw_line(
                MARGIN_LEFT_MM + 3.0,
                y + row_height,
                PAGE_WIDTH_MM - MARGIN_RIGHT_MM - 3.0,
                y + row_height,
                color_rule(),
                0.35,
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&row.category),
                MARGIN_LEFT_MM + 4.0,
                centered_y(category_height),
                44.0,
                7.4,
                BuiltinFont::HelveticaBold,
                color_body(),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&row.value),
                MARGIN_LEFT_MM + 55.0,
                centered_y(value_height),
                42.0,
                7.4,
                BuiltinFont::Helvetica,
                color_body(),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&note),
                MARGIN_LEFT_MM + 101.0,
                centered_y(note_height),
                72.0,
                7.4,
                BuiltinFont::Helvetica,
                color_muted(),
            );
            y += row_height;
        }

        self.y_mm += total_height;
        Ok(())
    }

    fn draw_attention_notes(&mut self, chips: &[ReportPdfChip]) -> Result<(), String> {
        if chips.is_empty() {
            return Ok(());
        }

        let visible = chips.len().min(4);
        let label_height = 8.0;
        let row_height = 17.0;
        let total_height = label_height + row_height * visible as f32;
        self.ensure_space(total_height);
        self.draw_section_label("Care notes", self.y_mm);

        let panel_y = self.y_mm + label_height;
        self.draw_card(
            MARGIN_LEFT_MM,
            panel_y,
            CONTENT_WIDTH_MM,
            row_height * visible as f32,
            Some(color_surface()),
        );

        for (index, chip) in chips.iter().take(visible).enumerate() {
            let y = panel_y + row_height * index as f32;
            if index > 0 {
                self.draw_line(
                    MARGIN_LEFT_MM + 4.0,
                    y,
                    PAGE_WIDTH_MM - MARGIN_RIGHT_MM - 4.0,
                    y,
                    color_rule(),
                    0.35,
                );
            }
            self.draw_wrapped_text_at(
                &sanitize_text(&chip.text),
                MARGIN_LEFT_MM + 5.0,
                y + 3.0,
                56.0,
                7.4,
                BuiltinFont::HelveticaBold,
                tone_text(&chip.tone),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&truncate_text(&chip.detail, 130)),
                MARGIN_LEFT_MM + 66.0,
                y + 3.0,
                107.0,
                7.5,
                BuiltinFont::Helvetica,
                color_body(),
            );
        }

        self.y_mm += total_height + 5.0;
        Ok(())
    }

    fn draw_section_label(&mut self, label: &str, y_mm: f32) {
        self.draw_wrapped_text_at(
            &label.to_uppercase(),
            MARGIN_LEFT_MM,
            y_mm,
            CONTENT_WIDTH_MM,
            7.8,
            BuiltinFont::HelveticaBold,
            color_muted(),
        );
    }

    fn draw_section_heading(&mut self, heading: &str) -> Result<(), String> {
        if self.y_mm > MARGIN_TOP_MM + 1.0 {
            self.add_gap(1.5);
        }

        self.draw_wrapped_text(
            heading,
            MARGIN_LEFT_MM,
            CONTENT_WIDTH_MM,
            15.0,
            BuiltinFont::HelveticaBold,
            color_ink(),
            3.0,
        )
    }

    fn draw_chart_card(
        &mut self,
        chart: &ReportPdfChart,
        x_mm: f32,
        y_mm: f32,
        width_mm: f32,
        height_mm: f32,
    ) -> Result<(), String> {
        self.draw_card(x_mm, y_mm, width_mm, height_mm, Some(color_surface()));
        self.draw_wrapped_text_at(
            &sanitize_text(&chart.title),
            x_mm + 3.0,
            y_mm + 4.0,
            width_mm - 6.0,
            9.5,
            BuiltinFont::HelveticaBold,
            color_body(),
        );

        if chart.points.is_empty() {
            self.draw_wrapped_text_at(
                "No data",
                x_mm + 3.0,
                y_mm + 18.0,
                width_mm - 6.0,
                9.0,
                BuiltinFont::Helvetica,
                color_muted(),
            );
            return Ok(());
        }

        let is_stool_type_chart = is_stool_type_chart(chart);
        let max_value = if is_stool_type_chart {
            7.0
        } else {
            chart
                .points
                .iter()
                .map(|point| point.primary_value.max(point.secondary_value.unwrap_or(0)))
                .max()
                .unwrap_or(0)
                .max(1) as f32
        };
        let min_value = if is_stool_type_chart { 1.0 } else { 0.0 };

        let chart_inner_top = y_mm + 16.5;
        let chart_inner_height = 23.0;
        let axis_width = if is_stool_type_chart { 15.0 } else { 7.0 };
        let chart_inner_width = width_mm - axis_width - 8.0;
        let start_x = x_mm + axis_width + 3.5;
        let group_width = chart_inner_width / chart.points.len() as f32;

        if is_stool_type_chart {
            self.draw_stool_type_axis_labels(x_mm + 3.0, chart_inner_top, axis_width, chart_inner_height);
        } else {
            self.draw_wrapped_text_at(
                &max_value.round().to_string(),
                x_mm + 3.0,
                chart_inner_top - 1.2,
                axis_width,
                5.6,
                BuiltinFont::Helvetica,
                color_muted(),
            );
            self.draw_wrapped_text_at(
                "0",
                x_mm + 3.0,
                chart_inner_top + chart_inner_height - 2.4,
                axis_width,
                5.6,
                BuiltinFont::Helvetica,
                color_muted(),
            );
        }

        for marker in [0.33_f32, 0.66_f32] {
            let y = chart_inner_top + chart_inner_height * marker;
            self.draw_line(start_x, y, x_mm + width_mm - 4.0, y, color_rule(), 0.25);
        }
        self.draw_line(
            start_x,
            chart_inner_top + chart_inner_height,
            x_mm + width_mm - 4.0,
            chart_inner_top + chart_inner_height,
            color_rule(),
            0.8,
        );

        if chart.kind == "line" {
            let mut previous: Option<(f32, f32)> = None;
            for (index, point) in chart.points.iter().enumerate() {
                let center_x = start_x + group_width * index as f32 + group_width / 2.0;
                let normalized_value = ((point.primary_value as f32).clamp(min_value, max_value) - min_value)
                    / (max_value - min_value).max(1.0);
                let center_y = chart_inner_top + (chart_inner_height - normalized_value * chart_inner_height);
                if let Some((px, py)) = previous {
                    self.draw_line(px, py, center_x, center_y, color_peach_text(), 1.2);
                }
                self.draw_circle(center_x, center_y, 1.25, color_peach_text());
                let value_label = chart_point_value_label(chart, point.primary_value);
                let value_label_width = if is_stool_type_chart { 14.0 } else { 6.0 };
                let value_label_x = (center_x - value_label_width / 2.0)
                    .max(start_x)
                    .min(x_mm + width_mm - 4.0 - value_label_width);
                self.draw_wrapped_text_at(
                    &value_label,
                    value_label_x,
                    (center_y - 4.4).max(y_mm + 12.8),
                    value_label_width,
                    if is_stool_type_chart { 5.2 } else { 5.8 },
                    BuiltinFont::HelveticaBold,
                    color_body(),
                );
                previous = Some((center_x, center_y));
                if should_draw_chart_label(index, chart.points.len()) {
                    self.draw_wrapped_text_at(
                        &sanitize_text(&point.label),
                        start_x + group_width * index as f32,
                        y_mm + height_mm - 13.2,
                        group_width.max(8.0),
                        6.2,
                        BuiltinFont::Helvetica,
                        color_muted(),
                    );
                }
            }
        } else {
            for (index, point) in chart.points.iter().enumerate() {
                let primary_height = (point.primary_value as f32 / max_value) * chart_inner_height;
                let secondary_height =
                    (point.secondary_value.unwrap_or(0) as f32 / max_value) * chart_inner_height;
                let group_x = start_x + group_width * index as f32;
                let primary_width = group_width * 0.32;
                let secondary_width = group_width * 0.22;

                if point.primary_value > 0 {
                    let primary_y = chart_inner_top + (chart_inner_height - primary_height);
                    self.draw_filled_rect(
                        group_x + 3.0,
                        primary_y,
                        primary_width,
                        primary_height.max(1.0),
                        color_peach_text(),
                    );
                    self.draw_wrapped_text_at(
                        &point.primary_value.to_string(),
                        group_x + 2.4,
                        (primary_y - 3.8).max(y_mm + 12.8),
                        primary_width + 4.0,
                        5.6,
                        BuiltinFont::HelveticaBold,
                        color_body(),
                    );
                }

                if point.secondary_value.unwrap_or(0) > 0 {
                    let secondary_value = point.secondary_value.unwrap_or(0);
                    let secondary_y = chart_inner_top + (chart_inner_height - secondary_height);
                    self.draw_filled_rect(
                        group_x + 3.0 + primary_width + 1.5,
                        secondary_y,
                        secondary_width,
                        secondary_height.max(1.0),
                        color_blue(),
                    );
                    self.draw_wrapped_text_at(
                        &secondary_value.to_string(),
                        group_x + 2.6 + primary_width,
                        (secondary_y - 3.8).max(y_mm + 12.8),
                        secondary_width + 8.0,
                        5.6,
                        BuiltinFont::HelveticaBold,
                        color_blue(),
                    );
                }

                if should_draw_chart_label(index, chart.points.len()) {
                    self.draw_wrapped_text_at(
                        &sanitize_text(&point.label),
                        group_x,
                        y_mm + height_mm - 13.2,
                        group_width.max(8.0),
                        6.2,
                        BuiltinFont::Helvetica,
                        color_muted(),
                    );
                }
            }
        }

        if is_stool_type_chart {
            let legend_y = y_mm + height_mm - 10.0;
            self.draw_filled_rect(x_mm + 3.0, legend_y + 1.2, 2.6, 2.6, color_peach_text());
            self.draw_wrapped_text_at(
                &sanitize_text(&chart.primary_label),
                x_mm + 7.0,
                legend_y,
                width_mm - 10.0,
                5.9,
                BuiltinFont::Helvetica,
                color_body(),
            );
            self.draw_wrapped_text_at(
                stool_type_legend_text(),
                x_mm + 3.0,
                legend_y + 4.0,
                width_mm - 6.0,
                4.9,
                BuiltinFont::Helvetica,
                color_muted(),
            );
            return Ok(());
        }

        let legend_y = y_mm + height_mm - 6.4;
        let primary_legend_width = if chart.secondary_label.is_some() {
            (width_mm - 10.0) * 0.46
        } else {
            width_mm - 10.0
        };
        self.draw_filled_rect(x_mm + 3.0, legend_y + 1.0, 2.6, 2.6, color_peach_text());
        self.draw_wrapped_text_at(
            &sanitize_text(&chart.primary_label),
            x_mm + 7.0,
            legend_y,
            primary_legend_width,
            6.2,
            BuiltinFont::Helvetica,
            color_body(),
        );

        if let Some(label) = &chart.secondary_label {
            let secondary_x = x_mm + width_mm * 0.56;
            self.draw_filled_rect(secondary_x, legend_y + 1.0, 2.6, 2.6, color_blue());
            self.draw_wrapped_text_at(
                &sanitize_text(label),
                secondary_x + 4.0,
                legend_y,
                width_mm * 0.36,
                6.2,
                BuiltinFont::Helvetica,
                color_body(),
            );
        }

        Ok(())
    }

    fn draw_stool_type_axis_labels(
        &mut self,
        x_mm: f32,
        chart_inner_top: f32,
        axis_width: f32,
        chart_inner_height: f32,
    ) {
        self.draw_wrapped_text_at(
            "T7 watery",
            x_mm,
            chart_inner_top - 1.2,
            axis_width,
            5.0,
            BuiltinFont::Helvetica,
            color_muted(),
        );
        self.draw_wrapped_text_at(
            "T4 smooth",
            x_mm,
            chart_inner_top + chart_inner_height * 0.48,
            axis_width,
            5.0,
            BuiltinFont::Helvetica,
            color_muted(),
        );
        self.draw_wrapped_text_at(
            "T1 hard",
            x_mm,
            chart_inner_top + chart_inner_height - 2.4,
            axis_width,
            5.0,
            BuiltinFont::Helvetica,
            color_muted(),
        );
    }

    fn draw_context_section(&mut self, section: &ReportPdfSection) -> Result<(), String> {
        self.draw_wrapped_text(
            &section.title,
            MARGIN_LEFT_MM,
            CONTENT_WIDTH_MM,
            12.0,
            BuiltinFont::HelveticaBold,
            color_ink(),
            2.4,
        )?;

        if section.rows.is_empty() {
            let height = 18.0;
            self.ensure_space(height);
            self.draw_card(
                MARGIN_LEFT_MM,
                self.y_mm,
                CONTENT_WIDTH_MM,
                height,
                Some(color_surface()),
            );
            self.draw_wrapped_text_at(
                &section.empty_text,
                MARGIN_LEFT_MM + 4.0,
                self.y_mm + 5.5,
                CONTENT_WIDTH_MM - 8.0,
                8.5,
                BuiltinFont::HelveticaOblique,
                color_muted(),
            );
            self.y_mm += height;
            return Ok(());
        }

        self.draw_context_table_header();
        let mut zebra = false;

        for row in &section.rows {
            let row_height = self.measure_context_row_height(row);
            if self.y_mm + row_height > PAGE_HEIGHT_MM - MARGIN_BOTTOM_MM {
                self.new_page();
                self.draw_wrapped_text(
                    &section.title,
                    MARGIN_LEFT_MM,
                    CONTENT_WIDTH_MM,
                    12.0,
                    BuiltinFont::HelveticaBold,
                    color_ink(),
                    2.4,
                )?;
                self.draw_context_table_header();
            }
            self.draw_context_row(row, row_height, zebra);
            zebra = !zebra;
            self.y_mm += row_height;
        }

        Ok(())
    }

    fn draw_context_table_header(&mut self) {
        let header_height = 9.5;
        self.ensure_space(header_height + 2.0);
        self.draw_card(
            MARGIN_LEFT_MM,
            self.y_mm,
            CONTENT_WIDTH_MM,
            header_height,
            Some(color_table_header()),
        );
        self.draw_wrapped_text_at(
            "Item",
            MARGIN_LEFT_MM + 3.0,
            self.y_mm + 3.1,
            45.0,
            7.4,
            BuiltinFont::HelveticaBold,
            color_body(),
        );
        self.draw_wrapped_text_at(
            "When / value",
            MARGIN_LEFT_MM + 52.0,
            self.y_mm + 3.1,
            42.0,
            7.4,
            BuiltinFont::HelveticaBold,
            color_body(),
        );
        self.draw_wrapped_text_at(
            "Details",
            MARGIN_LEFT_MM + 96.0,
            self.y_mm + 3.1,
            79.0,
            7.4,
            BuiltinFont::HelveticaBold,
            color_body(),
        );
        self.y_mm += header_height;
    }

    fn draw_context_row(&mut self, row: &ReportPdfSectionRow, height: f32, zebra: bool) {
        let fill = if zebra {
            color_zebra()
        } else {
            color_surface()
        };
        self.draw_filled_rect(MARGIN_LEFT_MM, self.y_mm, CONTENT_WIDTH_MM, height, fill);
        self.draw_line(
            MARGIN_LEFT_MM,
            self.y_mm + height,
            PAGE_WIDTH_MM - MARGIN_RIGHT_MM,
            self.y_mm + height,
            color_rule(),
            0.35,
        );

        let title_height = line_block_height(&row.title, 45.0, 8.0);
        let meta_text = row.meta.as_deref().unwrap_or("-");
        let meta_height = line_block_height(meta_text, 42.0, 7.6);
        let detail_text = row.detail.as_deref().unwrap_or("-");
        let detail_height = line_block_height(detail_text, 79.0, 7.6);
        let row_y = self.y_mm;
        let centered_y = |block_height: f32| row_y + ((height - block_height) / 2.0).max(2.0);

        self.draw_wrapped_text_at(
            &sanitize_text(&row.title),
            MARGIN_LEFT_MM + 3.0,
            centered_y(title_height),
            45.0,
            8.0,
            BuiltinFont::HelveticaBold,
            color_body(),
        );

        self.draw_wrapped_text_at(
            &sanitize_text(meta_text),
            MARGIN_LEFT_MM + 52.0,
            centered_y(meta_height),
            42.0,
            7.6,
            BuiltinFont::Helvetica,
            color_muted(),
        );

        self.draw_wrapped_text_at(
            &sanitize_text(detail_text),
            MARGIN_LEFT_MM + 96.0,
            centered_y(detail_height),
            79.0,
            7.6,
            BuiltinFont::Helvetica,
            color_body(),
        );
    }

    fn draw_timeline_header(&mut self) {
        let header_height = 10.0;
        self.ensure_space(header_height + 2.0);
        self.draw_card(
            MARGIN_LEFT_MM,
            self.y_mm,
            CONTENT_WIDTH_MM,
            header_height,
            Some(color_table_header()),
        );
        self.draw_wrapped_text_at(
            "Date / Time",
            MARGIN_LEFT_MM + 2.5,
            self.y_mm + 3.2,
            30.0,
            8.0,
            BuiltinFont::HelveticaBold,
            color_body(),
        );
        self.draw_wrapped_text_at(
            "Event",
            MARGIN_LEFT_MM + 34.0,
            self.y_mm + 3.2,
            25.0,
            8.0,
            BuiltinFont::HelveticaBold,
            color_body(),
        );
        self.draw_wrapped_text_at(
            "Details",
            MARGIN_LEFT_MM + 61.0,
            self.y_mm + 3.2,
            73.0,
            8.0,
            BuiltinFont::HelveticaBold,
            color_body(),
        );
        self.draw_wrapped_text_at(
            "Parent Note",
            MARGIN_LEFT_MM + 136.0,
            self.y_mm + 3.2,
            39.0,
            8.0,
            BuiltinFont::HelveticaBold,
            color_body(),
        );
        self.y_mm += header_height;
    }

    fn draw_timeline_row(&mut self, row: &ReportPdfTimelineRow, zebra: bool) -> Result<(), String> {
        let font_size = 7.4;
        let line_height = pt_to_mm(font_size * 1.28);
        let date_text = sanitize_text(&row.date_time);
        let event_text = sanitize_text(&row.event_type);
        let detail_text = sanitize_text(&row.details);
        let note_text = sanitize_text(row.note.as_deref().unwrap_or("-"));
        let date_lines = wrap_text(&date_text, 29.0, font_size);
        let event_lines = wrap_text(&event_text, 24.0, font_size);
        let detail_lines = wrap_text(&detail_text, 72.0, font_size);
        let note_lines = wrap_text(&note_text, 38.0, font_size);
        let max_lines = date_lines
            .len()
            .max(event_lines.len())
            .max(detail_lines.len())
            .max(note_lines.len())
            .max(1);
        let mut line_offset = 0usize;

        while line_offset < max_lines {
            let bottom = PAGE_HEIGHT_MM - MARGIN_BOTTOM_MM;
            if self.y_mm + 12.0 > bottom {
                self.new_page();
                self.draw_section_heading("Clinical Timeline Appendix")?;
                self.draw_timeline_header();
            }

            let available_height = (bottom - self.y_mm - 6.0).max(line_height);
            let available_lines = (available_height / line_height).floor().max(1.0) as usize;
            let chunk_len = (max_lines - line_offset).min(available_lines);
            let height = (chunk_len as f32 * line_height + 6.0).max(12.0);
            let fill = if zebra {
                color_zebra()
            } else {
                color_surface()
            };

            self.draw_filled_rect(MARGIN_LEFT_MM, self.y_mm, CONTENT_WIDTH_MM, height, fill);
            self.draw_line(
                MARGIN_LEFT_MM,
                self.y_mm + height,
                PAGE_WIDTH_MM - MARGIN_RIGHT_MM,
                self.y_mm + height,
                color_rule(),
                0.35,
            );

            let chunk_height = chunk_len as f32 * line_height;
            let text_y = self.y_mm + ((height - chunk_height) / 2.0).max(2.0);

            self.draw_text_line_slice(
                &date_lines,
                line_offset,
                chunk_len,
                MARGIN_LEFT_MM + 2.5,
                text_y,
                font_size,
                BuiltinFont::Helvetica,
                color_body(),
            );
            self.draw_text_line_slice(
                &event_lines,
                line_offset,
                chunk_len,
                MARGIN_LEFT_MM + 34.0,
                text_y,
                font_size,
                BuiltinFont::HelveticaBold,
                color_body(),
            );
            self.draw_text_line_slice(
                &detail_lines,
                line_offset,
                chunk_len,
                MARGIN_LEFT_MM + 61.0,
                text_y,
                font_size,
                BuiltinFont::Helvetica,
                color_body(),
            );
            self.draw_text_line_slice(
                &note_lines,
                line_offset,
                chunk_len,
                MARGIN_LEFT_MM + 136.0,
                text_y,
                font_size,
                BuiltinFont::Helvetica,
                color_muted(),
            );

            self.y_mm += height;
            line_offset += chunk_len;
        }

        Ok(())
    }

    fn measure_context_row_height(&self, row: &ReportPdfSectionRow) -> f32 {
        let title = line_block_height(&row.title, 45.0, 8.0);
        let meta = line_block_height(row.meta.as_deref().unwrap_or("-"), 42.0, 7.6);
        let detail = line_block_height(row.detail.as_deref().unwrap_or("-"), 79.0, 7.6);
        (title.max(meta).max(detail) + 6.4).max(13.0)
    }

    fn draw_wrapped_text(
        &mut self,
        text: &str,
        x_mm: f32,
        max_width_mm: f32,
        font_size_pt: f32,
        font: BuiltinFont,
        color: Color,
        gap_after_mm: f32,
    ) -> Result<(), String> {
        let block_height = line_block_height(text, max_width_mm, font_size_pt);
        self.ensure_space(block_height + gap_after_mm);
        self.draw_wrapped_text_at(
            text,
            x_mm,
            self.y_mm,
            max_width_mm,
            font_size_pt,
            font,
            color,
        );
        self.y_mm += block_height + gap_after_mm;
        Ok(())
    }

    fn draw_wrapped_text_at(
        &mut self,
        text: &str,
        x_mm: f32,
        y_from_top_mm: f32,
        max_width_mm: f32,
        font_size_pt: f32,
        font: BuiltinFont,
        color: Color,
    ) {
        let line_height_mm = pt_to_mm(font_size_pt * 1.28);
        let sanitized = sanitize_text(text);
        let mut y = y_from_top_mm;

        for paragraph in sanitized.split('\n') {
            let lines = wrap_text(paragraph, max_width_mm, font_size_pt);
            let lines = if lines.is_empty() {
                vec![String::new()]
            } else {
                lines
            };
            for line in lines {
                self.ops
                    .extend(text_ops(&line, x_mm, y, font_size_pt, font, color.clone()));
                y += line_height_mm;
            }
            y += 0.4;
        }
    }

    fn draw_text_line_slice(
        &mut self,
        lines: &[String],
        start: usize,
        count: usize,
        x_mm: f32,
        y_from_top_mm: f32,
        font_size_pt: f32,
        font: BuiltinFont,
        color: Color,
    ) {
        let line_height_mm = pt_to_mm(font_size_pt * 1.28);
        for (index, line) in lines.iter().skip(start).take(count).enumerate() {
            let sanitized = sanitize_text(line);
            self.ops.extend(text_ops(
                &sanitized,
                x_mm,
                y_from_top_mm + line_height_mm * index as f32,
                font_size_pt,
                font,
                color.clone(),
            ));
        }
    }

    fn draw_card(
        &mut self,
        x_mm: f32,
        y_from_top_mm: f32,
        width_mm: f32,
        height_mm: f32,
        fill: Option<Color>,
    ) {
        self.ops.push(Op::SetOutlineColor {
            col: color_border(),
        });
        self.ops.push(Op::SetOutlineThickness { pt: Pt(0.45) });
        self.ops.push(Op::SetFillColor {
            col: fill.unwrap_or_else(color_surface),
        });
        self.ops.push(Op::DrawPolygon {
            polygon: polygon_from_top_points(
                rounded_rect_points(x_mm, y_from_top_mm, width_mm, height_mm, 3.8, 6),
                PaintMode::FillStroke,
            ),
        });
    }

    fn draw_filled_rect(
        &mut self,
        x_mm: f32,
        y_from_top_mm: f32,
        width_mm: f32,
        height_mm: f32,
        color: Color,
    ) {
        self.ops.push(Op::SetFillColor { col: color });
        self.ops.push(Op::DrawPolygon {
            polygon: top_rect(x_mm, y_from_top_mm, width_mm, height_mm, PaintMode::Fill)
                .to_polygon(),
        });
    }

    fn draw_rounded_rect(
        &mut self,
        x_mm: f32,
        y_from_top_mm: f32,
        width_mm: f32,
        height_mm: f32,
        radius_mm: f32,
        color: Color,
    ) {
        self.ops.push(Op::SetFillColor { col: color });
        self.ops.push(Op::DrawPolygon {
            polygon: polygon_from_top_points(
                rounded_rect_points(x_mm, y_from_top_mm, width_mm, height_mm, radius_mm, 6),
                PaintMode::Fill,
            ),
        });
    }

    fn draw_line(
        &mut self,
        x1_mm: f32,
        y1_from_top_mm: f32,
        x2_mm: f32,
        y2_from_top_mm: f32,
        color: Color,
        thickness_pt: f32,
    ) {
        self.ops.push(Op::SetOutlineColor { col: color });
        self.ops.push(Op::SetOutlineThickness {
            pt: Pt(thickness_pt),
        });
        self.ops.push(Op::DrawLine {
            line: Line {
                points: vec![
                    LinePoint {
                        p: Point {
                            x: Mm(x1_mm).into(),
                            y: Mm(PAGE_HEIGHT_MM - y1_from_top_mm).into(),
                        },
                        bezier: false,
                    },
                    LinePoint {
                        p: Point {
                            x: Mm(x2_mm).into(),
                            y: Mm(PAGE_HEIGHT_MM - y2_from_top_mm).into(),
                        },
                        bezier: false,
                    },
                ],
                is_closed: false,
            },
        });
    }

    fn draw_circle(
        &mut self,
        center_x_mm: f32,
        center_y_from_top_mm: f32,
        radius_mm: f32,
        color: Color,
    ) {
        let points = circle_points(center_x_mm, center_y_from_top_mm, radius_mm, 48);
        self.ops.push(Op::SetFillColor { col: color });
        self.ops.push(Op::DrawPolygon {
            polygon: polygon_from_top_points(points, PaintMode::Fill),
        });
    }

    fn draw_child_avatar(
        &mut self,
        payload: &ReportPdfPayload,
        center_x_mm: f32,
        center_y_from_top_mm: f32,
        radius_mm: f32,
    ) {
        self.draw_circle(
            center_x_mm,
            center_y_from_top_mm,
            radius_mm,
            avatar_color(payload.child_avatar_color.as_deref()),
        );

        if let Some(data_url) = payload.child_avatar_data_url.as_deref() {
            if self.draw_avatar_image(data_url, center_x_mm, center_y_from_top_mm, radius_mm) {
                return;
            }
        }

        let initial = payload
            .child_name
            .trim()
            .chars()
            .next()
            .map(|ch| ch.to_uppercase().collect::<String>())
            .unwrap_or_else(|| "?".to_string());
        self.draw_wrapped_text_at(
            &sanitize_text(&initial),
            center_x_mm - radius_mm * 0.28,
            center_y_from_top_mm + radius_mm * 0.18,
            radius_mm,
            radius_mm * 1.45,
            BuiltinFont::HelveticaBold,
            gray(1.0),
        );
    }

    fn draw_avatar_image(
        &mut self,
        data_url: &str,
        center_x_mm: f32,
        center_y_from_top_mm: f32,
        radius_mm: f32,
    ) -> bool {
        let Some(bytes) = decode_data_url(data_url) else {
            return false;
        };
        let mut warnings = Vec::new();
        let Ok(image) = RawImage::decode_from_bytes(&bytes, &mut warnings) else {
            return false;
        };

        let image_width = image.width.max(1) as f32;
        let image_height = image.height.max(1) as f32;
        let diameter_mm = radius_mm * 2.0;
        let dpi = 300.0;
        let target_size_pt = mm_to_pt(diameter_mm);
        let natural_width_pt = image_width / dpi * 72.0;
        let natural_height_pt = image_height / dpi * 72.0;
        let scale = (target_size_pt / natural_width_pt).max(target_size_pt / natural_height_pt);
        let draw_width_pt = natural_width_pt * scale;
        let draw_height_pt = natural_height_pt * scale;
        let box_left_pt = mm_to_pt(center_x_mm - radius_mm);
        let box_bottom_pt = mm_to_pt(PAGE_HEIGHT_MM - center_y_from_top_mm - radius_mm);
        let translate_x = box_left_pt + (target_size_pt - draw_width_pt) / 2.0;
        let translate_y = box_bottom_pt + (target_size_pt - draw_height_pt) / 2.0;
        let image_id = self.doc.add_image(&image);

        self.ops.push(Op::SaveGraphicsState);
        self.ops.push(Op::DrawPolygon {
            polygon: polygon_from_top_points(
                circle_points(center_x_mm, center_y_from_top_mm, radius_mm, 36),
                PaintMode::Clip,
            ),
        });
        self.ops.push(Op::UseXobject {
            id: image_id,
            transform: XObjectTransform {
                translate_x: Some(Pt(translate_x)),
                translate_y: Some(Pt(translate_y)),
                rotate: None,
                scale_x: Some(scale),
                scale_y: Some(scale),
                dpi: Some(dpi),
            },
        });
        self.ops.push(Op::RestoreGraphicsState);
        true
    }

    fn draw_ellipse(
        &mut self,
        center_x_mm: f32,
        center_y_from_top_mm: f32,
        radius_x_mm: f32,
        radius_y_mm: f32,
        color: Color,
    ) {
        let points = ellipse_points(
            center_x_mm,
            center_y_from_top_mm,
            radius_x_mm,
            radius_y_mm,
            24,
        );
        self.ops.push(Op::SetFillColor { col: color });
        self.ops.push(Op::DrawPolygon {
            polygon: polygon_from_top_points(points, PaintMode::Fill),
        });
    }

    fn draw_logo_mark(&mut self, x_mm: f32, y_from_top_mm: f32, size_mm: f32) {
        let scale = size_mm / 512.0;
        self.draw_rounded_rect(
            x_mm,
            y_from_top_mm,
            size_mm,
            size_mm,
            115.0 * scale,
            rgb(1.0, 0.941, 0.902),
        );
        self.draw_circle(
            x_mm + 256.0 * scale,
            y_from_top_mm + 256.0 * scale,
            135.0 * scale,
            rgb(1.0, 0.831, 0.722),
        );
        self.draw_ellipse(
            x_mm + 256.0 * scale,
            y_from_top_mm + 281.0 * scale,
            90.0 * scale,
            70.0 * scale,
            rgb(1.0, 0.737, 0.580),
        );
        self.draw_ellipse(
            x_mm + 256.0 * scale,
            y_from_top_mm + 316.0 * scale,
            16.0 * scale,
            10.0 * scale,
            rgb(0.961, 0.788, 0.659),
        );
        self.draw_circle(
            x_mm + 192.0 * scale,
            y_from_top_mm + 268.0 * scale,
            20.0 * scale,
            rgb(1.0, 0.72, 0.72),
        );
        self.draw_circle(
            x_mm + 320.0 * scale,
            y_from_top_mm + 268.0 * scale,
            20.0 * scale,
            rgb(1.0, 0.72, 0.72),
        );
        self.draw_circle(
            x_mm + 218.0 * scale,
            y_from_top_mm + 226.0 * scale,
            14.0 * scale,
            rgb(0.36, 0.25, 0.20),
        );
        self.draw_circle(
            x_mm + 294.0 * scale,
            y_from_top_mm + 226.0 * scale,
            14.0 * scale,
            rgb(0.36, 0.25, 0.20),
        );
        self.draw_circle(
            x_mm + 223.0 * scale,
            y_from_top_mm + 222.0 * scale,
            5.0 * scale,
            gray(1.0),
        );
        self.draw_circle(
            x_mm + 299.0 * scale,
            y_from_top_mm + 222.0 * scale,
            5.0 * scale,
            gray(1.0),
        );

        let mut previous: Option<(f32, f32)> = None;
        for index in 0..=10 {
            let t = index as f32 / 10.0;
            let source_x =
                (1.0 - t).powi(2) * 228.0 + 2.0 * (1.0 - t) * t * 256.0 + t.powi(2) * 284.0;
            let source_y =
                (1.0 - t).powi(2) * 276.0 + 2.0 * (1.0 - t) * t * 308.0 + t.powi(2) * 276.0;
            let point = (x_mm + source_x * scale, y_from_top_mm + source_y * scale);
            if let Some((prev_x, prev_y)) = previous {
                self.draw_line(
                    prev_x,
                    prev_y,
                    point.0,
                    point.1,
                    rgb(0.831, 0.518, 0.353),
                    1.0,
                );
            }
            previous = Some(point);
        }
    }
}

fn text_ops(
    text: &str,
    x_mm: f32,
    y_from_top_mm: f32,
    font_size_pt: f32,
    font: BuiltinFont,
    color: Color,
) -> Vec<Op> {
    vec![
        Op::StartTextSection,
        Op::SetFillColor { col: color },
        Op::SetFont {
            font: PdfFontHandle::Builtin(font),
            size: Pt(font_size_pt),
        },
        Op::SetTextCursor {
            pos: Point {
                x: Mm(x_mm).into(),
                y: Mm(PAGE_HEIGHT_MM - y_from_top_mm).into(),
            },
        },
        Op::ShowText {
            items: vec![TextItem::Text(text.to_string())],
        },
        Op::EndTextSection,
    ]
}

fn footer_ops(page_number: usize) -> Vec<Op> {
    let y = PAGE_HEIGHT_MM - 9.0;
    let dot_y = y - 1.6;
    let color = gray(0.55);
    let mut ops = Vec::new();

    ops.extend(text_ops(
        "Tiny Tummy",
        MARGIN_LEFT_MM,
        y,
        8.0,
        BuiltinFont::Helvetica,
        color.clone(),
    ));
    ops.push(Op::SetFillColor { col: color.clone() });
    ops.push(Op::DrawPolygon {
        polygon: polygon_from_top_points(
            circle_points(MARGIN_LEFT_MM + 18.8, dot_y, 0.38, 10),
            PaintMode::Fill,
        ),
    });
    ops.extend(text_ops(
        "Baby health log",
        MARGIN_LEFT_MM + 21.0,
        y,
        8.0,
        BuiltinFont::Helvetica,
        color.clone(),
    ));
    ops.push(Op::SetFillColor { col: color.clone() });
    ops.push(Op::DrawPolygon {
        polygon: polygon_from_top_points(
            circle_points(MARGIN_LEFT_MM + 48.0, dot_y, 0.38, 10),
            PaintMode::Fill,
        ),
    });
    ops.extend(text_ops(
        &format!("Page {}", page_number),
        MARGIN_LEFT_MM + 50.2,
        y,
        8.0,
        BuiltinFont::Helvetica,
        color,
    ));

    ops
}

fn page_background_ops() -> Vec<Op> {
    vec![
        Op::SetFillColor {
            col: color_background(),
        },
        Op::DrawPolygon {
            polygon: Rect {
                x: Mm(0.0).into(),
                y: Mm(0.0).into(),
                width: Mm(PAGE_WIDTH_MM).into(),
                height: Mm(PAGE_HEIGHT_MM).into(),
                mode: Some(PaintMode::Fill),
                winding_order: Some(WindingOrder::NonZero),
            }
            .to_polygon(),
        },
    ]
}

fn top_rect(x_mm: f32, y_from_top_mm: f32, width_mm: f32, height_mm: f32, mode: PaintMode) -> Rect {
    Rect {
        x: Mm(x_mm).into(),
        y: Mm(PAGE_HEIGHT_MM - y_from_top_mm - height_mm).into(),
        width: Mm(width_mm).into(),
        height: Mm(height_mm).into(),
        mode: Some(mode),
        winding_order: Some(WindingOrder::NonZero),
    }
}

fn polygon_from_top_points(
    points: Vec<(f32, f32)>,
    mode: PaintMode,
) -> printpdf::graphics::Polygon {
    printpdf::graphics::Polygon {
        rings: vec![printpdf::graphics::PolygonRing {
            points: points
                .into_iter()
                .map(|(x_mm, y_from_top_mm)| LinePoint {
                    p: Point {
                        x: Mm(x_mm).into(),
                        y: Mm(PAGE_HEIGHT_MM - y_from_top_mm).into(),
                    },
                    bezier: false,
                })
                .collect(),
        }],
        mode,
        winding_order: WindingOrder::NonZero,
    }
}

fn rounded_rect_points(
    x_mm: f32,
    y_from_top_mm: f32,
    width_mm: f32,
    height_mm: f32,
    radius_mm: f32,
    steps: usize,
) -> Vec<(f32, f32)> {
    let radius = radius_mm.min(width_mm / 2.0).min(height_mm / 2.0);
    let corners = [
        (
            x_mm + width_mm - radius,
            y_from_top_mm + radius,
            -std::f32::consts::FRAC_PI_2,
            0.0,
        ),
        (
            x_mm + width_mm - radius,
            y_from_top_mm + height_mm - radius,
            0.0,
            std::f32::consts::FRAC_PI_2,
        ),
        (
            x_mm + radius,
            y_from_top_mm + height_mm - radius,
            std::f32::consts::FRAC_PI_2,
            std::f32::consts::PI,
        ),
        (
            x_mm + radius,
            y_from_top_mm + radius,
            std::f32::consts::PI,
            std::f32::consts::PI + std::f32::consts::FRAC_PI_2,
        ),
    ];

    corners
        .iter()
        .flat_map(|(center_x, center_y, start_angle, end_angle)| {
            (0..=steps).map(move |index| {
                let t = index as f32 / steps.max(1) as f32;
                let angle = start_angle + (end_angle - start_angle) * t;
                (
                    center_x + radius * angle.cos(),
                    center_y + radius * angle.sin(),
                )
            })
        })
        .collect()
}

fn circle_points(
    center_x_mm: f32,
    center_y_from_top_mm: f32,
    radius_mm: f32,
    segments: usize,
) -> Vec<(f32, f32)> {
    (0..segments)
        .map(|index| {
            let angle = (index as f32 / segments as f32) * std::f32::consts::TAU;
            (
                center_x_mm + radius_mm * angle.cos(),
                center_y_from_top_mm + radius_mm * angle.sin(),
            )
        })
        .collect()
}

fn ellipse_points(
    center_x_mm: f32,
    center_y_from_top_mm: f32,
    radius_x_mm: f32,
    radius_y_mm: f32,
    segments: usize,
) -> Vec<(f32, f32)> {
    (0..segments)
        .map(|index| {
            let angle = (index as f32 / segments as f32) * std::f32::consts::TAU;
            (
                center_x_mm + radius_x_mm * angle.cos(),
                center_y_from_top_mm + radius_y_mm * angle.sin(),
            )
        })
        .collect()
}

fn tone_fill(tone: &str) -> Color {
    match tone {
        "alert" => rgb(1.0, 0.925, 0.900),
        "caution" => rgb(1.0, 0.942, 0.835),
        "healthy" => rgb(0.880, 0.955, 0.900),
        "info" => rgb(0.910, 0.940, 0.995),
        _ => rgb(0.985, 0.970, 0.952),
    }
}

fn tone_text(tone: &str) -> Color {
    match tone {
        "alert" => rgb(0.58, 0.20, 0.16),
        "caution" => rgb(0.55, 0.35, 0.12),
        "healthy" => rgb(0.18, 0.39, 0.24),
        "info" => rgb(0.20, 0.31, 0.55),
        _ => gray(0.22),
    }
}

fn color_background() -> Color {
    rgb(1.0, 0.982, 0.955)
}

fn color_warm_panel() -> Color {
    rgb(1.0, 0.965, 0.930)
}

fn color_surface() -> Color {
    rgb(1.0, 0.998, 0.993)
}

fn color_table_header() -> Color {
    rgb(0.988, 0.955, 0.928)
}

fn color_zebra() -> Color {
    rgb(0.998, 0.988, 0.978)
}

fn color_border() -> Color {
    rgb(0.900, 0.850, 0.805)
}

fn color_rule() -> Color {
    rgb(0.895, 0.865, 0.835)
}

fn color_ink() -> Color {
    rgb(0.190, 0.070, 0.050)
}

fn color_body() -> Color {
    rgb(0.260, 0.205, 0.170)
}

fn color_muted() -> Color {
    rgb(0.470, 0.395, 0.340)
}

fn color_peach() -> Color {
    rgb(0.965, 0.610, 0.450)
}

fn color_peach_text() -> Color {
    rgb(0.890, 0.390, 0.235)
}

fn color_blue() -> Color {
    rgb(0.390, 0.560, 0.800)
}

fn avatar_color(value: Option<&str>) -> Color {
    value.and_then(parse_hex_color).unwrap_or_else(color_peach)
}

fn parse_hex_color(value: &str) -> Option<Color> {
    let hex = value.trim().strip_prefix('#').unwrap_or(value.trim());
    if !hex.is_ascii() {
        return None;
    }
    match hex.len() {
        3 => {
            let mut expanded = String::with_capacity(6);
            for ch in hex.chars() {
                expanded.push(ch);
                expanded.push(ch);
            }
            parse_hex_color(&expanded)
        }
        6 => {
            let red = parse_hex_pair(&hex[0..2])?;
            let green = parse_hex_pair(&hex[2..4])?;
            let blue = parse_hex_pair(&hex[4..6])?;
            Some(rgb(red, green, blue))
        }
        _ => None,
    }
}

fn parse_hex_pair(value: &str) -> Option<f32> {
    u8::from_str_radix(value, 16)
        .ok()
        .map(|channel| channel as f32 / 255.0)
}

fn overview_value_font_size(value: &str) -> f32 {
    match sanitize_text(value).chars().count() {
        0..=8 => 13.0,
        9..=16 => 12.0,
        _ => 10.4,
    }
}

fn insight_value_font_size(value: &str) -> f32 {
    match sanitize_text(value).chars().count() {
        0..=18 => 9.8,
        _ => 8.8,
    }
}

fn truncate_text(input: &str, max_chars: usize) -> String {
    let mut chars = input.chars();
    let mut output = String::new();

    for _ in 0..max_chars {
        if let Some(ch) = chars.next() {
            output.push(ch);
        } else {
            return output;
        }
    }

    if chars.next().is_some() {
        output.push_str("...");
    }

    output
}

fn build_overview_items(payload: &ReportPdfPayload) -> Vec<ReportOverviewItem> {
    let mut items: Vec<ReportOverviewItem> = Vec::new();
    let stool_card = find_summary_card(payload, "Stool pattern");
    let feed_card = find_summary_card(payload, "Feed rhythm");
    let symptom_card = find_summary_card(payload, "Symptoms & episodes");
    let growth_card = find_summary_card(payload, "Growth & milestones");
    let no_poop_stat = find_stat(payload, "Longest no-poop streak");
    let bottle_stat = payload.dashboard_stats.iter().find(|stat| {
        stat.label == "Bottle volume / day" || stat.label == "Breastfeeding duration / day"
    });
    let stool_total = chart_total(payload, "Daily stool output", false);
    let no_poop_total = chart_total(payload, "Daily stool output", true);
    let feed_total = chart_total(payload, "Daily feed activity", false);

    if let Some(card) = stool_card {
        items.push(ReportOverviewItem {
            label: "Stool count".to_string(),
            value: card.value.clone(),
            detail: card.detail.clone(),
        });
    } else if stool_total > 0 {
        items.push(ReportOverviewItem {
            label: "Stool count".to_string(),
            value: format!(
                "{} stool{}",
                stool_total,
                if stool_total == 1 { "" } else { "s" }
            ),
            detail: "Total logged stools".to_string(),
        });
    }

    if let Some(stat) = no_poop_stat {
        items.push(ReportOverviewItem {
            label: "No-poop days".to_string(),
            value: if no_poop_total > 0 {
                format!(
                    "{} day{}",
                    no_poop_total,
                    if no_poop_total == 1 { "" } else { "s" }
                )
            } else {
                "None".to_string()
            },
            detail: format!("Longest streak {}", stat.value),
        });
    }

    if let Some(card) = feed_card {
        items.push(ReportOverviewItem {
            label: "Feed sessions".to_string(),
            value: card.value.clone(),
            detail: card.detail.clone(),
        });
    } else if feed_total > 0 {
        items.push(ReportOverviewItem {
            label: "Feed sessions".to_string(),
            value: format!(
                "{} feed{}",
                feed_total,
                if feed_total == 1 { "" } else { "s" }
            ),
            detail: "Total logged feeds".to_string(),
        });
    }

    if let Some(stat) = bottle_stat {
        items.push(ReportOverviewItem {
            label: overview_label(&stat.label).to_string(),
            value: stat.value.clone(),
            detail: stat
                .detail
                .clone()
                .unwrap_or_else(|| "Selected period".to_string()),
        });
    }

    if let Some(card) = symptom_card {
        items.push(ReportOverviewItem {
            label: "Symptoms".to_string(),
            value: card.value.clone(),
            detail: card.detail.clone(),
        });
    }

    if let Some(card) = growth_card {
        items.push(ReportOverviewItem {
            label: "Growth / milestones".to_string(),
            value: card.value.clone(),
            detail: card.detail.clone(),
        });
    }

    for stat in &payload.dashboard_stats {
        if items.len() >= 6 {
            break;
        }
        let label = overview_label(&stat.label).to_string();
        if items.iter().any(|item| item.label == label) {
            continue;
        }
        items.push(ReportOverviewItem {
            label,
            value: stat.value.clone(),
            detail: stat
                .detail
                .clone()
                .unwrap_or_else(|| "Selected period".to_string()),
        });
    }

    for card in &payload.summary_cards {
        if items.len() >= 6 {
            break;
        }
        let label = overview_label(&card.title).to_string();
        if items.iter().any(|item| item.label == label) {
            continue;
        }
        items.push(ReportOverviewItem {
            label,
            value: card.value.clone(),
            detail: card.detail.clone(),
        });
    }

    items
}

fn build_insight_items(payload: &ReportPdfPayload) -> Vec<ReportInsightItem> {
    let mut items = Vec::new();

    for card in &payload.summary_cards {
        if items.len() >= 4 {
            break;
        }

        items.push(ReportInsightItem {
            title: card.title.clone(),
            value: card.value.clone(),
            detail: card.detail.clone(),
            tone: card.tone.clone(),
        });
    }

    items
}

fn build_at_a_glance_rows(payload: &ReportPdfPayload) -> Vec<AtAGlanceRow> {
    let mut rows = Vec::new();

    for item in build_overview_items(payload) {
        rows.push(AtAGlanceRow {
            category: item.label,
            value: item.value,
            note: item.detail,
        });
    }

    for stat in &payload.dashboard_stats {
        if rows.len() >= 8 {
            break;
        }
        let category = overview_label(&stat.label).to_string();
        if rows.iter().any(|row| row.category == category) {
            continue;
        }
        rows.push(AtAGlanceRow {
            category,
            value: stat.value.clone(),
            note: stat
                .detail
                .clone()
                .unwrap_or_else(|| "Selected period".to_string()),
        });
    }

    rows
}

fn overview_label(label: &str) -> &str {
    match label {
        "Avg stools / day" => "Stool count",
        "Longest no-poop streak" => "No-poop days",
        "Feed sessions / day" => "Feed sessions",
        "Bottle volume / day" => "Bottle volume",
        "Breastfeeding duration / day" => "Nursing time",
        "Active episode" => "Episode",
        "Severe symptoms" => "Symptoms",
        "Growth entries" => "Growth",
        "Stool pattern" => "Stool count",
        "Feed rhythm" => "Feed sessions",
        "Symptoms & episodes" => "Symptoms",
        "Growth & milestones" => "Growth",
        _ => label,
    }
}

fn find_summary_card<'a>(
    payload: &'a ReportPdfPayload,
    title: &str,
) -> Option<&'a ReportPdfSummaryCard> {
    payload
        .summary_cards
        .iter()
        .find(|card| card.title == title)
}

fn find_stat<'a>(payload: &'a ReportPdfPayload, label: &str) -> Option<&'a ReportPdfStat> {
    payload
        .dashboard_stats
        .iter()
        .find(|stat| stat.label == label)
}

fn chart_total(payload: &ReportPdfPayload, title: &str, secondary: bool) -> i64 {
    payload
        .charts
        .iter()
        .find(|chart| chart.title == title)
        .map(|chart| {
            chart
                .points
                .iter()
                .map(|point| {
                    if secondary {
                        point.secondary_value.unwrap_or(0)
                    } else {
                        point.primary_value
                    }
                })
                .sum()
        })
        .unwrap_or(0)
}

fn should_draw_chart_label(index: usize, len: usize) -> bool {
    len <= 8 || index == 0 || index + 1 == len || index % ((len / 4).max(1)) == 0
}

fn is_stool_type_chart(chart: &ReportPdfChart) -> bool {
    chart.title == "Stool type trend"
}

fn chart_point_value_label(chart: &ReportPdfChart, value: i64) -> String {
    if is_stool_type_chart(chart) {
        return stool_type_compact_label(value).to_string();
    }

    value.to_string()
}

fn stool_type_compact_label(value: i64) -> &'static str {
    match value {
        1 => "T1 hard",
        2 => "T2 lumpy",
        3 => "T3 cracked",
        4 => "T4 smooth",
        5 => "T5 soft",
        6 => "T6 mushy",
        7 => "T7 watery",
        _ => "Type ?",
    }
}

fn stool_type_legend_text() -> &'static str {
    "T1 hard pellets, T2 lumpy, T3 cracked, T4 smooth, T5 soft, T6 mushy, T7 watery"
}

fn cover_title_lines(title: &str) -> (String, String) {
    if title.contains("Poop & Tummy") {
        return ("Poop & Tummy".to_string(), "Report".to_string());
    }

    if title.contains("Baby Health") {
        return ("Baby Health".to_string(), "Report".to_string());
    }

    let sanitized = sanitize_text(title);
    let first_line = sanitized
        .strip_suffix(" Report")
        .unwrap_or(&sanitized)
        .trim()
        .to_string();

    if first_line.is_empty() {
        ("Tiny Tummy".to_string(), "Report".to_string())
    } else {
        (first_line, "Report".to_string())
    }
}

fn patient_detail_line(payload: &ReportPdfPayload) -> String {
    if payload.patient_summary.trim().is_empty() {
        return payload.child_meta.clone();
    }

    let prefix = format!("{} · ", payload.child_name);
    payload
        .patient_summary
        .strip_prefix(&prefix)
        .unwrap_or(&payload.patient_summary)
        .to_string()
}

fn wrap_text(text: &str, max_width_mm: f32, font_size_pt: f32) -> Vec<String> {
    let cleaned = text.trim();
    if cleaned.is_empty() {
        return Vec::new();
    }

    let approx_char_width_mm = (font_size_pt * 0.50) * 25.4 / 72.0;
    let max_chars = ((max_width_mm / approx_char_width_mm).floor() as usize).max(10);
    let mut lines = Vec::new();
    let mut current = String::new();

    for word in cleaned.split_whitespace() {
        if current.is_empty() {
            current.push_str(word);
            continue;
        }

        let next_len = current.len() + 1 + word.len();
        if next_len <= max_chars {
            current.push(' ');
            current.push_str(word);
        } else {
            lines.push(current);
            current = word.to_string();
        }
    }

    if !current.is_empty() {
        lines.push(current);
    }

    lines
}

fn line_block_height(text: &str, max_width_mm: f32, font_size_pt: f32) -> f32 {
    let line_count = sanitize_text(text)
        .split('\n')
        .map(|paragraph| {
            wrap_text(paragraph, max_width_mm, font_size_pt)
                .len()
                .max(1)
        })
        .sum::<usize>()
        .max(1);
    line_count as f32 * pt_to_mm(font_size_pt * 1.28)
}

fn sanitize_text(input: &str) -> String {
    input
        .chars()
        .filter_map(|ch| match ch {
            '\u{00C2}' | '\u{00E2}' | '\u{20AC}' | '\u{2039}' | '\u{0153}' => None,
            '\u{00A0}' => Some(' '),
            '\u{00A2}' | '\u{00B7}' | '\u{2022}' | '\u{2027}' | '\u{2219}' => Some('-'),
            '\u{2018}' | '\u{2019}' => Some('\''),
            '\u{201C}' | '\u{201D}' => Some('"'),
            '\u{2013}' | '\u{2014}' => Some('-'),
            '\u{2192}' => Some('>'),
            '\n' | '\t' => Some(ch),
            c if c.is_ascii() => Some(c),
            c if ('\u{00A1}'..='\u{00FF}').contains(&c) => Some(c),
            _ => Some('?'),
        })
        .collect()
}

fn rgb(r: f32, g: f32, b: f32) -> Color {
    Color::Rgb(Rgb::new(r, g, b, None))
}

fn gray(value: f32) -> Color {
    rgb(value, value, value)
}

fn pt_to_mm(pt: f32) -> f32 {
    pt * 25.4 / 72.0
}

fn mm_to_pt(mm: f32) -> f32 {
    mm * 72.0 / 25.4
}

fn decode_data_url(data_url: &str) -> Option<Vec<u8>> {
    let payload = data_url
        .split_once(',')
        .map(|(_, encoded)| encoded)
        .unwrap_or(data_url)
        .trim();
    STANDARD.decode(payload).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_a_valid_pdf() {
        let payload = ReportPdfPayload {
            title: "Baby Health Report".to_string(),
            subtitle: "2026-03-01 to 2026-03-31".to_string(),
            child_name: "Sam".to_string(),
            child_meta: "6 months old - Feeding mixed".to_string(),
            child_avatar_color: Some("#2563EB".to_string()),
            child_avatar_data_url: None,
            generated_at_label: "Generated by Tiny Tummy | Mar 31, 2026".to_string(),
            patient_summary: "Sam · DOB 2025-09-30 · 6 months old · Diet mixed".to_string(),
            attention_chips: vec![ReportPdfChip {
                tone: "caution".to_string(),
                text: "No-poop streak recorded".to_string(),
                detail: "Longest marked no-poop streak was 2 days.".to_string(),
            }],
            dashboard_stats: vec![
                ReportPdfStat {
                    label: "Avg stools / day".to_string(),
                    value: "1.2".to_string(),
                    detail: Some("36 stools logged".to_string()),
                },
                ReportPdfStat {
                    label: "Longest no-poop streak".to_string(),
                    value: "2d".to_string(),
                    detail: Some("Based on marked no-poop days".to_string()),
                },
                ReportPdfStat {
                    label: "Feed sessions / day".to_string(),
                    value: "6.4".to_string(),
                    detail: Some("192 feeds in range".to_string()),
                },
                ReportPdfStat {
                    label: "Bottle volume / day".to_string(),
                    value: "620 ml".to_string(),
                    detail: Some("Logged bottle amounts only".to_string()),
                },
            ],
            summary_cards: vec![
                ReportPdfSummaryCard {
                    title: "Stool pattern".to_string(),
                    value: "6 stools".to_string(),
                    detail: "Most common type 4 · Most common color yellow".to_string(),
                    tone: "healthy".to_string(),
                },
                ReportPdfSummaryCard {
                    title: "Feed rhythm".to_string(),
                    value: "192 feeds".to_string(),
                    detail: "6.4 feed sessions per day".to_string(),
                    tone: "info".to_string(),
                },
                ReportPdfSummaryCard {
                    title: "Symptoms & episodes".to_string(),
                    value: "1 symptom".to_string(),
                    detail: "Review symptom details in the table view".to_string(),
                    tone: "caution".to_string(),
                },
                ReportPdfSummaryCard {
                    title: "Growth & milestones".to_string(),
                    value: "1 growth · 2 milestones".to_string(),
                    detail: "Recent measurements and context included".to_string(),
                    tone: "info".to_string(),
                },
            ],
            charts: vec![
                ReportPdfChart {
                    title: "Daily stool output".to_string(),
                    kind: "bar".to_string(),
                    primary_label: "Stools".to_string(),
                    secondary_label: Some("No-poop days".to_string()),
                    points: vec![
                        ReportPdfChartPoint {
                            label: "Mon".to_string(),
                            primary_value: 2,
                            secondary_value: Some(0),
                        },
                        ReportPdfChartPoint {
                            label: "Tue".to_string(),
                            primary_value: 1,
                            secondary_value: Some(1),
                        },
                    ],
                },
                ReportPdfChart {
                    title: "Stool type trend".to_string(),
                    kind: "line".to_string(),
                    primary_label: "Type".to_string(),
                    secondary_label: None,
                    points: vec![
                        ReportPdfChartPoint {
                            label: "Mon".to_string(),
                            primary_value: 4,
                            secondary_value: None,
                        },
                        ReportPdfChartPoint {
                            label: "Tue".to_string(),
                            primary_value: 2,
                            secondary_value: None,
                        },
                    ],
                },
            ],
            context_sections: vec![ReportPdfSection {
                title: "Symptoms".to_string(),
                empty_text: "No symptoms.".to_string(),
                rows: vec![ReportPdfSectionRow {
                    title: "Straining".to_string(),
                    meta: Some("Moderate - Mar 12, 9:20 AM".to_string()),
                    detail: Some("Parent noted extra fussiness.".to_string()),
                }],
            }],
            timeline: vec![ReportPdfTimelineRow {
                date_time: "Mar 12, 9:20 AM".to_string(),
                event_type: "Stool".to_string(),
                details: "Type 4 Â· Color yellow Â· Size medium".to_string(),
                note: Some(
                    "Timed breastfeeding session â€¢ Left 1m 17s â€¢ Right 1m 24s".to_string(),
                ),
            }],
        };

        let encoded = generate_report_pdf(payload).expect("pdf should generate");
        let bytes = STANDARD.decode(encoded).expect("should decode pdf bytes");
        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 1000);

        let output = std::env::temp_dir().join("tiny-tummy-report-test.pdf");
        std::fs::write(output, bytes).expect("should write pdf");
    }

    #[test]
    fn sanitizes_pdf_unsafe_separators() {
        assert_eq!(
            sanitize_text("Timed breastfeeding session • Left 1m 17s · Right 1m 24s"),
            "Timed breastfeeding session - Left 1m 17s - Right 1m 24s"
        );
        assert_eq!(
            sanitize_text("Breastfed Â· Both Â· 3 min â€¢ calm"),
            "Breastfed - Both - 3 min - calm"
        );
    }
}
