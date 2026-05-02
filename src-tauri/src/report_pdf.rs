use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use printpdf::{
    graphics::{Line, LinePoint, PaintMode, Point, Rect, WindingOrder},
    ops::PdfFontHandle,
    BuiltinFont, Color, Mm, Op, PdfDocument, PdfPage, PdfSaveOptions, Pt, Rgb, TextItem,
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
    if !payload.charts.is_empty() || !payload.context_sections.is_empty() {
        layout.new_page();
        layout.draw_page_two(&payload)?;
    }

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
    tone: String,
}

struct ReportInsightItem {
    title: String,
    value: String,
    detail: String,
    tone: String,
}

struct ReportRecordRow {
    title: String,
    meta: String,
    detail: String,
    tone: String,
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
            let footer = format!("Tiny Tummy | Baby health log | Page {}", index + 1);
            page.ops.extend(text_ops(
                &footer,
                MARGIN_LEFT_MM,
                PAGE_HEIGHT_MM - 9.0,
                8.0,
                BuiltinFont::Helvetica,
                gray(0.55),
            ));
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
        self.draw_compact_page_header(
            payload,
            "Daily overview",
            "A quick look at daily averages, ranges, and table records.",
        );

        if !payload.charts.is_empty() {
            self.draw_chart_panel(&payload.charts)?;
            self.add_gap(5.0);
        }

        if !payload.context_sections.is_empty() {
            self.draw_section_heading("Detailed summary tables")?;
        }

        for section in &payload.context_sections {
            self.draw_context_section(section)?;
            self.add_gap(4.0);
        }

        Ok(())
    }

    fn draw_appendix_pages(&mut self, timeline: &[ReportPdfTimelineRow]) -> Result<(), String> {
        self.draw_section_heading("Timeline details")?;
        self.draw_wrapped_text(
            "Chronological log for clinical review. Columns: Date/Time, Event, Details, Parent Note.",
            MARGIN_LEFT_MM,
            CONTENT_WIDTH_MM,
            9.0,
            BuiltinFont::Helvetica,
            gray(0.45),
            3.0,
        )?;

        self.draw_timeline_header();
        let mut zebra = false;

        for row in timeline {
            let height = self.measure_timeline_row_height(row);
            if self.y_mm + height > PAGE_HEIGHT_MM - MARGIN_BOTTOM_MM {
                self.new_page();
                self.draw_section_heading("Timeline details")?;
                self.draw_timeline_header();
            }

            self.draw_timeline_row(row, zebra)?;
            zebra = !zebra;
        }

        Ok(())
    }

    fn draw_page_one_summary(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        self.draw_cover_hero(payload)?;
        self.add_gap(5.0);
        self.draw_overview_tiles(payload)?;
        self.add_gap(5.0);
        self.draw_insight_cards(payload)?;
        self.add_gap(5.0);
        self.draw_detail_record_table(payload)?;
        Ok(())
    }

    fn draw_cover_hero(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let y = self.y_mm;
        let height = 88.0;
        self.ensure_space(height);
        self.draw_rounded_rect(
            MARGIN_LEFT_MM,
            y,
            CONTENT_WIDTH_MM,
            height,
            4.2,
            rgb(1.0, 0.982, 0.964),
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

        self.draw_wrapped_text_at(
            "Baby",
            MARGIN_LEFT_MM + 6.0,
            y + 29.0,
            88.0,
            28.0,
            BuiltinFont::HelveticaBold,
            rgb(0.20, 0.07, 0.05),
        );
        self.draw_wrapped_text_at(
            "Health Report",
            MARGIN_LEFT_MM + 6.0,
            y + 41.8,
            94.0,
            28.0,
            BuiltinFont::HelveticaBold,
            rgb(0.20, 0.07, 0.05),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&payload.child_name),
            MARGIN_LEFT_MM + 6.0,
            y + 58.0,
            78.0,
            16.0,
            BuiltinFont::HelveticaBold,
            rgb(0.95, 0.45, 0.29),
        );
        let child_meta = if payload.child_meta.trim().is_empty() {
            &payload.patient_summary
        } else {
            &payload.child_meta
        };

        self.draw_wrapped_text_at(
            &sanitize_text(child_meta),
            MARGIN_LEFT_MM + 6.0,
            y + 67.2,
            82.0,
            9.4,
            BuiltinFont::Helvetica,
            rgb(0.22, 0.18, 0.16),
        );

        self.draw_wrapped_text_at(
            "Report period",
            MARGIN_LEFT_MM + 6.0,
            y + 76.8,
            40.0,
            7.2,
            BuiltinFont::Helvetica,
            gray(0.42),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&payload.subtitle),
            MARGIN_LEFT_MM + 6.0,
            y + 81.6,
            70.0,
            7.8,
            BuiltinFont::Helvetica,
            gray(0.24),
        );
        self.draw_wrapped_text_at(
            "Generated",
            MARGIN_LEFT_MM + 70.0,
            y + 76.8,
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
            y + 81.6,
            48.0,
            7.8,
            BuiltinFont::Helvetica,
            gray(0.24),
        );

        let portrait_x = MARGIN_LEFT_MM + 122.0;
        let portrait_y = y + 24.0;
        self.draw_circle(
            portrait_x + 25.0,
            portrait_y + 25.0,
            25.0,
            rgb(1.0, 0.91, 0.84),
        );
        self.draw_logo_mark(portrait_x + 8.0, portrait_y + 8.0, 34.0);
        self.draw_circle(portrait_x + 58.0, y + 24.0, 0.9, rgb(0.98, 0.74, 0.58));
        self.draw_sparkle(portrait_x + 54.0, y + 35.0, 1.6, rgb(0.98, 0.74, 0.58));
        self.draw_sparkle(portrait_x + 84.0, y + 29.0, 1.4, rgb(0.98, 0.74, 0.58));

        self.y_mm += height;
        Ok(())
    }

    fn draw_overview_tiles(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let items = build_overview_items(payload);
        if items.is_empty() {
            return Ok(());
        }

        let visible = items.len().min(5);
        let label_height = 8.0;
        let card_height = 34.0;
        let gap = 3.4;
        let card_width =
            (CONTENT_WIDTH_MM - gap * (visible.saturating_sub(1) as f32)) / visible as f32;
        self.ensure_space(label_height + card_height);

        self.draw_section_label("Overview", self.y_mm);
        let card_y = self.y_mm + label_height;

        for (index, item) in items.iter().take(visible).enumerate() {
            let x = MARGIN_LEFT_MM + index as f32 * (card_width + gap);
            self.draw_card(
                x,
                card_y,
                card_width,
                card_height,
                Some(rgb(1.0, 0.998, 0.994)),
            );
            self.draw_circle(
                x + card_width / 2.0,
                card_y + 7.0,
                4.2,
                tone_fill(&item.tone),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&item.label),
                x + 2.5,
                card_y + 14.0,
                card_width - 5.0,
                7.0,
                BuiltinFont::HelveticaBold,
                gray(0.12),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&item.value),
                x + 2.5,
                card_y + 19.2,
                card_width - 5.0,
                13.0,
                BuiltinFont::HelveticaBold,
                gray(0.04),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&item.detail),
                x + 2.5,
                card_y + 28.0,
                card_width - 5.0,
                6.6,
                BuiltinFont::Helvetica,
                gray(0.34),
            );
        }

        self.y_mm += label_height + card_height;
        Ok(())
    }

    fn draw_insight_cards(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let items = build_insight_items(payload);
        if items.is_empty() {
            return Ok(());
        }

        let visible = items.len().min(4);
        let label_height = 8.0;
        let card_height = 38.0;
        let gap = 4.0;
        let card_width =
            (CONTENT_WIDTH_MM - gap * (visible.saturating_sub(1) as f32)) / visible as f32;
        self.ensure_space(label_height + card_height);

        self.draw_section_label("Patterns & Insights", self.y_mm);
        let card_y = self.y_mm + label_height;
        for (index, card) in items.iter().take(visible).enumerate() {
            let x = MARGIN_LEFT_MM + index as f32 * (card_width + gap);
            self.draw_card(
                x,
                card_y,
                card_width,
                card_height,
                Some(tone_fill(&card.tone)),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&card.title),
                x + 3.0,
                card_y + 4.0,
                card_width - 6.0,
                7.0,
                BuiltinFont::Helvetica,
                tone_text(&card.tone),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&card.value),
                x + 3.0,
                card_y + 11.0,
                card_width - 6.0,
                10.0,
                BuiltinFont::HelveticaBold,
                gray(0.06),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&truncate_text(&card.detail, 70)),
                x + 3.0,
                card_y + 19.5,
                card_width - 6.0,
                6.8,
                BuiltinFont::Helvetica,
                gray(0.24),
            );
            self.draw_circle(
                x + card_width - 8.0,
                card_y + card_height - 8.0,
                5.0,
                gray(0.96),
            );
        }

        self.y_mm += label_height + card_height;
        Ok(())
    }

    fn draw_detail_record_table(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let rows = build_detail_record_rows(payload);
        if rows.is_empty() {
            return Ok(());
        }

        let visible = rows.len().min(5);
        let label_height = 8.0;
        let header_height = 8.5;
        let row_height = 10.5;
        let total_height = label_height + header_height + row_height * visible as f32;
        self.ensure_space(total_height);

        self.draw_section_label("Detailed Summary Record", self.y_mm);
        let table_y = self.y_mm + label_height;
        self.draw_card(
            MARGIN_LEFT_MM,
            table_y,
            CONTENT_WIDTH_MM,
            header_height + row_height * visible as f32,
            Some(rgb(1.0, 0.998, 0.994)),
        );
        self.draw_filled_rect(
            MARGIN_LEFT_MM,
            table_y,
            CONTENT_WIDTH_MM,
            header_height,
            rgb(0.989, 0.964, 0.944),
        );
        self.draw_wrapped_text_at(
            "Record",
            MARGIN_LEFT_MM + 3.0,
            table_y + 2.8,
            48.0,
            7.0,
            BuiltinFont::HelveticaBold,
            gray(0.18),
        );
        self.draw_wrapped_text_at(
            "When",
            MARGIN_LEFT_MM + 55.0,
            table_y + 2.8,
            42.0,
            7.0,
            BuiltinFont::HelveticaBold,
            gray(0.18),
        );
        self.draw_wrapped_text_at(
            "Details",
            MARGIN_LEFT_MM + 101.0,
            table_y + 2.8,
            73.0,
            7.0,
            BuiltinFont::HelveticaBold,
            gray(0.18),
        );

        for (index, row) in rows.iter().take(visible).enumerate() {
            let y = table_y + header_height + row_height * index as f32;
            if index % 2 == 1 {
                self.draw_filled_rect(
                    MARGIN_LEFT_MM,
                    y,
                    CONTENT_WIDTH_MM,
                    row_height,
                    rgb(0.997, 0.991, 0.986),
                );
            }
            self.draw_line(
                MARGIN_LEFT_MM,
                y + row_height,
                PAGE_WIDTH_MM - MARGIN_RIGHT_MM,
                y + row_height,
                rgb(0.90, 0.87, 0.84),
                0.45,
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&row.title),
                MARGIN_LEFT_MM + 3.0,
                y + 2.8,
                48.0,
                7.0,
                BuiltinFont::HelveticaBold,
                tone_text(&row.tone),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&row.meta),
                MARGIN_LEFT_MM + 55.0,
                y + 2.8,
                42.0,
                7.0,
                BuiltinFont::Helvetica,
                gray(0.35),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&truncate_text(&row.detail, 76)),
                MARGIN_LEFT_MM + 101.0,
                y + 2.8,
                73.0,
                7.0,
                BuiltinFont::Helvetica,
                gray(0.24),
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
            gray(0.16),
        );
        self.draw_wrapped_text_at(
            &format!("Report period: {}", sanitize_text(&payload.subtitle)),
            MARGIN_LEFT_MM,
            PAGE_HEIGHT_MM - 18.0,
            80.0,
            6.8,
            BuiltinFont::Helvetica,
            gray(0.45),
        );
        self.y_mm += 14.0;
        self.draw_wrapped_text_at(
            title,
            MARGIN_LEFT_MM,
            self.y_mm,
            CONTENT_WIDTH_MM,
            15.0,
            BuiltinFont::HelveticaBold,
            gray(0.08),
        );
        self.draw_wrapped_text_at(
            subtitle,
            MARGIN_LEFT_MM,
            self.y_mm + 7.0,
            CONTENT_WIDTH_MM,
            8.0,
            BuiltinFont::Helvetica,
            gray(0.42),
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
        let chart_height = 42.0;
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

    fn draw_section_label(&mut self, label: &str, y_mm: f32) {
        self.draw_wrapped_text_at(
            &label.to_uppercase(),
            MARGIN_LEFT_MM,
            y_mm,
            CONTENT_WIDTH_MM,
            7.8,
            BuiltinFont::HelveticaBold,
            gray(0.42),
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
            gray(0.12),
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
        self.draw_card(
            x_mm,
            y_mm,
            width_mm,
            height_mm,
            Some(rgb(0.997, 0.996, 0.994)),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&chart.title),
            x_mm + 3.0,
            y_mm + 4.0,
            width_mm - 6.0,
            9.5,
            BuiltinFont::HelveticaBold,
            gray(0.16),
        );

        if chart.points.is_empty() {
            self.draw_wrapped_text_at(
                "No data",
                x_mm + 3.0,
                y_mm + 18.0,
                width_mm - 6.0,
                9.0,
                BuiltinFont::Helvetica,
                gray(0.52),
            );
            return Ok(());
        }

        let max_value = chart
            .points
            .iter()
            .map(|point| point.primary_value.max(point.secondary_value.unwrap_or(0)))
            .max()
            .unwrap_or(0)
            .max(1) as f32;

        let chart_inner_top = y_mm + 14.0;
        let chart_inner_height = 18.0;
        let chart_inner_width = width_mm - 8.0;
        let start_x = x_mm + 4.0;
        let group_width = chart_inner_width / chart.points.len() as f32;

        self.draw_line(
            x_mm + 4.0,
            chart_inner_top + chart_inner_height,
            x_mm + width_mm - 4.0,
            chart_inner_top + chart_inner_height,
            gray(0.88),
            0.8,
        );

        if chart.kind == "line" {
            let mut previous: Option<(f32, f32)> = None;
            for (index, point) in chart.points.iter().enumerate() {
                let center_x = start_x + group_width * index as f32 + group_width / 2.0;
                let center_y = chart_inner_top
                    + (chart_inner_height
                        - (point.primary_value as f32 / max_value) * chart_inner_height);
                if let Some((px, py)) = previous {
                    self.draw_line(px, py, center_x, center_y, rgb(0.93, 0.62, 0.48), 1.2);
                }
                self.draw_circle(center_x, center_y, 1.3, rgb(0.93, 0.62, 0.48));
                previous = Some((center_x, center_y));
                self.draw_wrapped_text_at(
                    &sanitize_text(&point.label),
                    start_x + group_width * index as f32,
                    y_mm + height_mm - 9.0,
                    group_width,
                    6.8,
                    BuiltinFont::Helvetica,
                    gray(0.48),
                );
            }
        } else {
            for (index, point) in chart.points.iter().enumerate() {
                let primary_height = (point.primary_value as f32 / max_value) * chart_inner_height;
                let secondary_height =
                    (point.secondary_value.unwrap_or(0) as f32 / max_value) * chart_inner_height;
                let group_x = start_x + group_width * index as f32;
                let primary_width = group_width * 0.32;
                let secondary_width = group_width * 0.22;

                self.draw_filled_rect(
                    group_x + 3.0,
                    chart_inner_top + (chart_inner_height - primary_height),
                    primary_width,
                    primary_height.max(1.0),
                    rgb(0.93, 0.62, 0.48),
                );

                if point.secondary_value.unwrap_or(0) > 0 {
                    self.draw_filled_rect(
                        group_x + 3.0 + primary_width + 1.5,
                        chart_inner_top + (chart_inner_height - secondary_height),
                        secondary_width,
                        secondary_height.max(1.0),
                        rgb(0.59, 0.70, 0.92),
                    );
                }

                self.draw_wrapped_text_at(
                    &sanitize_text(&point.label),
                    group_x,
                    y_mm + height_mm - 9.0,
                    group_width,
                    6.8,
                    BuiltinFont::Helvetica,
                    gray(0.48),
                );
            }
        }

        self.draw_wrapped_text_at(
            &sanitize_text(&chart.primary_label),
            x_mm + 3.0,
            y_mm + height_mm - 4.2,
            width_mm - 28.0,
            6.2,
            BuiltinFont::Helvetica,
            gray(0.36),
        );

        if let Some(label) = &chart.secondary_label {
            self.draw_wrapped_text_at(
                &sanitize_text(label),
                x_mm + width_mm * 0.56,
                y_mm + height_mm - 4.2,
                width_mm * 0.40,
                6.2,
                BuiltinFont::Helvetica,
                gray(0.50),
            );
        }

        Ok(())
    }

    fn draw_context_section(&mut self, section: &ReportPdfSection) -> Result<(), String> {
        self.draw_wrapped_text(
            &section.title,
            MARGIN_LEFT_MM,
            CONTENT_WIDTH_MM,
            12.0,
            BuiltinFont::HelveticaBold,
            gray(0.15),
            2.4,
        )?;

        if section.rows.is_empty() {
            self.draw_wrapped_text(
                &section.empty_text,
                MARGIN_LEFT_MM,
                CONTENT_WIDTH_MM,
                9.5,
                BuiltinFont::HelveticaOblique,
                gray(0.52),
                3.0,
            )?;
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
                    gray(0.15),
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
            Some(rgb(0.974, 0.953, 0.936)),
        );
        self.draw_wrapped_text_at(
            "Item",
            MARGIN_LEFT_MM + 3.0,
            self.y_mm + 3.1,
            45.0,
            7.4,
            BuiltinFont::HelveticaBold,
            gray(0.18),
        );
        self.draw_wrapped_text_at(
            "When / value",
            MARGIN_LEFT_MM + 52.0,
            self.y_mm + 3.1,
            42.0,
            7.4,
            BuiltinFont::HelveticaBold,
            gray(0.18),
        );
        self.draw_wrapped_text_at(
            "Details",
            MARGIN_LEFT_MM + 96.0,
            self.y_mm + 3.1,
            79.0,
            7.4,
            BuiltinFont::HelveticaBold,
            gray(0.18),
        );
        self.y_mm += header_height;
    }

    fn draw_context_row(&mut self, row: &ReportPdfSectionRow, height: f32, zebra: bool) {
        let fill = if zebra {
            rgb(0.997, 0.991, 0.986)
        } else {
            gray(1.0)
        };
        self.draw_filled_rect(MARGIN_LEFT_MM, self.y_mm, CONTENT_WIDTH_MM, height, fill);
        self.draw_line(
            MARGIN_LEFT_MM,
            self.y_mm + height,
            PAGE_WIDTH_MM - MARGIN_RIGHT_MM,
            self.y_mm + height,
            rgb(0.90, 0.87, 0.84),
            0.5,
        );

        self.draw_wrapped_text_at(
            &sanitize_text(&row.title),
            MARGIN_LEFT_MM + 3.0,
            self.y_mm + 3.2,
            45.0,
            8.0,
            BuiltinFont::HelveticaBold,
            gray(0.15),
        );

        self.draw_wrapped_text_at(
            &sanitize_text(row.meta.as_deref().unwrap_or("-")),
            MARGIN_LEFT_MM + 52.0,
            self.y_mm + 3.2,
            42.0,
            7.6,
            BuiltinFont::Helvetica,
            gray(0.35),
        );

        self.draw_wrapped_text_at(
            &sanitize_text(row.detail.as_deref().unwrap_or("-")),
            MARGIN_LEFT_MM + 96.0,
            self.y_mm + 3.2,
            79.0,
            7.6,
            BuiltinFont::Helvetica,
            gray(0.25),
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
            Some(rgb(0.974, 0.953, 0.936)),
        );
        self.draw_wrapped_text_at(
            "Date / Time",
            MARGIN_LEFT_MM + 2.5,
            self.y_mm + 3.2,
            30.0,
            8.0,
            BuiltinFont::HelveticaBold,
            gray(0.18),
        );
        self.draw_wrapped_text_at(
            "Event",
            MARGIN_LEFT_MM + 34.0,
            self.y_mm + 3.2,
            25.0,
            8.0,
            BuiltinFont::HelveticaBold,
            gray(0.18),
        );
        self.draw_wrapped_text_at(
            "Details",
            MARGIN_LEFT_MM + 61.0,
            self.y_mm + 3.2,
            73.0,
            8.0,
            BuiltinFont::HelveticaBold,
            gray(0.18),
        );
        self.draw_wrapped_text_at(
            "Parent Note",
            MARGIN_LEFT_MM + 136.0,
            self.y_mm + 3.2,
            39.0,
            8.0,
            BuiltinFont::HelveticaBold,
            gray(0.18),
        );
        self.y_mm += header_height;
    }

    fn draw_timeline_row(&mut self, row: &ReportPdfTimelineRow, zebra: bool) -> Result<(), String> {
        let height = self.measure_timeline_row_height(row);
        let fill = if zebra {
            rgb(0.997, 0.991, 0.986)
        } else {
            gray(1.0)
        };
        self.draw_filled_rect(MARGIN_LEFT_MM, self.y_mm, CONTENT_WIDTH_MM, height, fill);
        self.draw_line(
            MARGIN_LEFT_MM,
            self.y_mm + height,
            PAGE_WIDTH_MM - MARGIN_RIGHT_MM,
            self.y_mm + height,
            rgb(0.90, 0.87, 0.84),
            0.5,
        );

        self.draw_wrapped_text_at(
            &sanitize_text(&row.date_time),
            MARGIN_LEFT_MM + 2.5,
            self.y_mm + 3.0,
            30.0,
            8.0,
            BuiltinFont::Helvetica,
            gray(0.20),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&row.event_type),
            MARGIN_LEFT_MM + 34.0,
            self.y_mm + 3.0,
            25.0,
            8.0,
            BuiltinFont::HelveticaBold,
            gray(0.16),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&row.details),
            MARGIN_LEFT_MM + 61.0,
            self.y_mm + 3.0,
            73.0,
            8.0,
            BuiltinFont::Helvetica,
            gray(0.24),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(row.note.as_deref().unwrap_or("-")),
            MARGIN_LEFT_MM + 136.0,
            self.y_mm + 3.0,
            39.0,
            8.0,
            BuiltinFont::Helvetica,
            gray(0.34),
        );

        self.y_mm += height;
        Ok(())
    }

    fn measure_context_row_height(&self, row: &ReportPdfSectionRow) -> f32 {
        let title = line_block_height(&row.title, 45.0, 8.0);
        let meta = line_block_height(row.meta.as_deref().unwrap_or("-"), 42.0, 7.6);
        let detail = line_block_height(row.detail.as_deref().unwrap_or("-"), 79.0, 7.6);
        (title.max(meta).max(detail) + 6.4).max(13.0)
    }

    fn measure_timeline_row_height(&self, row: &ReportPdfTimelineRow) -> f32 {
        let left = line_block_height(&row.date_time, 30.0, 8.0);
        let event = line_block_height(&row.event_type, 25.0, 8.0);
        let details = line_block_height(&row.details, 73.0, 8.0);
        let note = line_block_height(row.note.as_deref().unwrap_or("-"), 39.0, 8.0);
        (left.max(event).max(details).max(note) + 6.0).max(13.0)
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

    fn draw_card(
        &mut self,
        x_mm: f32,
        y_from_top_mm: f32,
        width_mm: f32,
        height_mm: f32,
        fill: Option<Color>,
    ) {
        self.ops.push(Op::SetOutlineColor { col: gray(0.86) });
        self.ops.push(Op::SetOutlineThickness { pt: Pt(0.6) });
        self.ops.push(Op::SetFillColor {
            col: fill.unwrap_or_else(|| gray(1.0)),
        });
        self.ops.push(Op::DrawPolygon {
            polygon: polygon_from_top_points(
                rounded_rect_points(x_mm, y_from_top_mm, width_mm, height_mm, 3.2, 6),
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
        let points = circle_points(center_x_mm, center_y_from_top_mm, radius_mm, 18);
        self.ops.push(Op::SetFillColor { col: color });
        self.ops.push(Op::DrawPolygon {
            polygon: polygon_from_top_points(points, PaintMode::Fill),
        });
    }

    fn draw_sparkle(
        &mut self,
        center_x_mm: f32,
        center_y_from_top_mm: f32,
        size_mm: f32,
        color: Color,
    ) {
        let points = vec![
            (center_x_mm, center_y_from_top_mm - size_mm),
            (
                center_x_mm + size_mm * 0.32,
                center_y_from_top_mm - size_mm * 0.32,
            ),
            (center_x_mm + size_mm, center_y_from_top_mm),
            (
                center_x_mm + size_mm * 0.32,
                center_y_from_top_mm + size_mm * 0.32,
            ),
            (center_x_mm, center_y_from_top_mm + size_mm),
            (
                center_x_mm - size_mm * 0.32,
                center_y_from_top_mm + size_mm * 0.32,
            ),
            (center_x_mm - size_mm, center_y_from_top_mm),
            (
                center_x_mm - size_mm * 0.32,
                center_y_from_top_mm - size_mm * 0.32,
            ),
        ];
        self.ops.push(Op::SetFillColor { col: color });
        self.ops.push(Op::DrawPolygon {
            polygon: polygon_from_top_points(points, PaintMode::Fill),
        });
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

fn page_background_ops() -> Vec<Op> {
    vec![
        Op::SetFillColor {
            col: rgb(1.0, 0.997, 0.992),
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
        "alert" => rgb(1.0, 0.943, 0.925),
        "caution" => rgb(1.0, 0.966, 0.900),
        "healthy" => rgb(0.934, 0.976, 0.946),
        "info" => rgb(0.948, 0.965, 0.996),
        _ => rgb(0.997, 0.996, 0.994),
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
    let mut items: Vec<ReportOverviewItem> = payload
        .dashboard_stats
        .iter()
        .map(|stat| {
            let label = overview_label(&stat.label).to_string();
            ReportOverviewItem {
                tone: overview_tone(&label).to_string(),
                label,
                value: stat.value.clone(),
                detail: stat
                    .detail
                    .clone()
                    .unwrap_or_else(|| "Selected period".to_string()),
            }
        })
        .collect();

    for card in &payload.summary_cards {
        if items.len() >= 5 {
            break;
        }
        items.push(ReportOverviewItem {
            label: overview_label(&card.title).to_string(),
            value: card.value.clone(),
            detail: card.detail.clone(),
            tone: card.tone.clone(),
        });
    }

    items
}

fn build_insight_items(payload: &ReportPdfPayload) -> Vec<ReportInsightItem> {
    let mut items = Vec::new();

    if let Some(chip) = payload.attention_chips.first() {
        items.push(ReportInsightItem {
            title: "Care note".to_string(),
            value: chip.text.clone(),
            detail: chip.detail.clone(),
            tone: chip.tone.clone(),
        });
    }

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

fn build_detail_record_rows(payload: &ReportPdfPayload) -> Vec<ReportRecordRow> {
    let mut rows: Vec<ReportRecordRow> = payload
        .timeline
        .iter()
        .take(5)
        .map(|row| {
            let detail = if let Some(note) = &row.note {
                format!("{} | {}", row.details, note)
            } else {
                row.details.clone()
            };
            ReportRecordRow {
                title: row.event_type.clone(),
                meta: row.date_time.clone(),
                detail,
                tone: record_tone(&row.event_type).to_string(),
            }
        })
        .collect();

    if rows.len() >= 5 {
        return rows;
    }

    for card in &payload.summary_cards {
        if rows.len() >= 5 {
            break;
        }

        rows.push(ReportRecordRow {
            title: card.title.clone(),
            meta: card.value.clone(),
            detail: card.detail.clone(),
            tone: card.tone.clone(),
        });
    }

    rows
}

fn overview_label(label: &str) -> &str {
    match label {
        "Avg stools / day" => "Poop",
        "Longest no-poop streak" => "No-poop",
        "Feed sessions / day" => "Feed",
        "Bottle volume / day" => "Bottle",
        "Breastfeeding duration / day" => "Nursing",
        "Active episode" => "Episode",
        "Severe symptoms" => "Symptoms",
        "Growth entries" => "Growth",
        "Stool pattern" => "Poop",
        "Feed rhythm" => "Feed",
        "Symptoms & episodes" => "Symptoms",
        "Growth & milestones" => "Growth",
        _ => label,
    }
}

fn overview_tone(label: &str) -> &str {
    match label {
        "Poop" | "No-poop" => "caution",
        "Feed" | "Bottle" | "Nursing" => "info",
        "Growth" => "healthy",
        "Symptoms" | "Episode" => "alert",
        _ => "default",
    }
}

fn record_tone(event_type: &str) -> &str {
    match event_type {
        "Stool" => "caution",
        "Feed" => "info",
        "Growth" | "Milestone" => "healthy",
        "Symptom" | "Episode" | "Episode update" => "alert",
        _ => "default",
    }
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
        .map(|ch| match ch {
            '\u{2018}' | '\u{2019}' => '\'',
            '\u{201C}' | '\u{201D}' => '"',
            '\u{2013}' | '\u{2014}' => '-',
            '\u{00B7}' => '-',
            '\u{2192}' => '>',
            '\n' | '\t' => ch,
            c if c.is_ascii() => c,
            c if ('\u{00A0}'..='\u{00FF}').contains(&c) => c,
            _ => '?',
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
                details: "Type 4 - Color yellow - Size medium".to_string(),
                note: Some("Normal consistency".to_string()),
            }],
        };

        let encoded = generate_report_pdf(payload).expect("pdf should generate");
        let bytes = STANDARD.decode(encoded).expect("should decode pdf bytes");
        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 1000);

        let output = std::env::temp_dir().join("tiny-tummy-report-test.pdf");
        std::fs::write(output, bytes).expect("should write pdf");
    }
}
