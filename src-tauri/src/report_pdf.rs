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
    #[serde(rename = "detail")]
    pub _detail: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReportPdfChip {
    pub tone: String,
    pub text: String,
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
    if !payload.context_sections.is_empty() {
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
            let footer = format!("Tiny Tummy · Baby health log · Page {}", index + 1);
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
        self.draw_brand_header(payload)?;
        self.draw_page_one_overview(payload)?;
        self.add_gap(4.0);
        self.draw_summary_cards(&payload.summary_cards)?;
        Ok(())
    }

    fn draw_page_two(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        if payload.charts.len() > 3 {
            self.draw_chart_grid("Additional trends", &payload.charts[3..], 2, 46.0)?;
            self.add_gap(2.0);
        }

        self.draw_section_heading("Clinical context")?;

        for section in &payload.context_sections {
            self.draw_context_section(section)?;
            self.add_gap(2.0);
        }

        Ok(())
    }

    fn draw_appendix_pages(&mut self, timeline: &[ReportPdfTimelineRow]) -> Result<(), String> {
        self.draw_section_heading("Appendix: Clinical Timeline")?;
        self.draw_wrapped_text(
            "Chronological appendix for clinical review. Columns: Date/Time, Event, Details, Parent Note.",
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
                self.draw_section_heading("Appendix: Clinical Timeline")?;
                self.draw_timeline_header();
            }

            self.draw_timeline_row(row, zebra)?;
            zebra = !zebra;
        }

        Ok(())
    }

    fn draw_brand_header(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        self.ensure_space(22.0);
        self.draw_logo_mark(MARGIN_LEFT_MM, self.y_mm + 1.5);
        self.draw_wrapped_text_at(
            &sanitize_text(&payload.title),
            MARGIN_LEFT_MM + 18.0,
            self.y_mm + 3.0,
            CONTENT_WIDTH_MM - 18.0,
            18.0,
            BuiltinFont::HelveticaBold,
            rgb(0.27, 0.22, 0.18),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&payload.subtitle),
            MARGIN_LEFT_MM + 18.0,
            self.y_mm + 10.5,
            80.0,
            10.0,
            BuiltinFont::Helvetica,
            gray(0.42),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&payload.generated_at_label),
            PAGE_WIDTH_MM - MARGIN_RIGHT_MM - 58.0,
            self.y_mm + 4.0,
            58.0,
            8.6,
            BuiltinFont::Helvetica,
            gray(0.50),
        );
        self.y_mm += 20.0;
        Ok(())
    }

    fn draw_page_one_overview(&mut self, payload: &ReportPdfPayload) -> Result<(), String> {
        let top_y = self.y_mm;
        let gap = 4.0;
        let left_width = 118.0;
        let right_width = CONTENT_WIDTH_MM - left_width - gap;
        let hero_height = 104.0;

        self.ensure_space(hero_height);
        self.draw_overview_hero(payload, MARGIN_LEFT_MM, top_y, left_width, hero_height)?;
        self.draw_overview_side_rail(
            payload,
            MARGIN_LEFT_MM + left_width + gap,
            top_y,
            right_width,
            hero_height,
        )?;

        self.y_mm = top_y + hero_height + 4.0;

        let secondary_start = payload.charts.len().min(1);
        let secondary_end = payload.charts.len().min(3);
        if secondary_end > secondary_start {
            self.draw_chart_grid(
                "Domain trends",
                &payload.charts[secondary_start..secondary_end],
                2,
                44.0,
            )?;
        }

        Ok(())
    }

    fn draw_overview_hero(
        &mut self,
        payload: &ReportPdfPayload,
        x_mm: f32,
        y_mm: f32,
        width_mm: f32,
        height_mm: f32,
    ) -> Result<(), String> {
        self.draw_card(x_mm, y_mm, width_mm, height_mm, Some(rgb(0.997, 0.996, 0.994)));
        self.draw_wrapped_text_at(
            "Weekly overview",
            x_mm + 5.0,
            y_mm + 6.0,
            60.0,
            13.0,
            BuiltinFont::HelveticaBold,
            gray(0.13),
        );

        let tab_y = y_mm + 5.5;
        let mut tab_x = x_mm + width_mm - 49.0;
        let tab_labels = ["Stool", "Feed", "Symptoms"];
        for (index, label) in tab_labels.iter().enumerate() {
            let fill = if index == 0 {
                rgb(0.38, 0.58, 0.98)
            } else {
                rgb(0.97, 0.97, 0.96)
            };
            let color = if index == 0 { gray(1.0) } else { gray(0.45) };
            self.draw_card(tab_x, tab_y, 14.0, 7.5, Some(fill));
            self.draw_wrapped_text_at(
                label,
                tab_x + 2.3,
                tab_y + 2.7,
                9.8,
                6.2,
                BuiltinFont::HelveticaBold,
                color,
            );
            tab_x += 15.5;
        }

        if let Some(chart) = payload.charts.first() {
            self.draw_hero_chart(chart, x_mm + 5.0, y_mm + 18.0, width_mm - 10.0, height_mm - 24.0)?;
        } else {
            self.draw_wrapped_text_at(
                "No chart data available for this range",
                x_mm + 5.0,
                y_mm + 28.0,
                width_mm - 10.0,
                9.0,
                BuiltinFont::Helvetica,
                gray(0.52),
            );
        }

        Ok(())
    }

    fn draw_overview_side_rail(
        &mut self,
        payload: &ReportPdfPayload,
        x_mm: f32,
        y_mm: f32,
        width_mm: f32,
        height_mm: f32,
    ) -> Result<(), String> {
        let snapshot_height = 28.0;
        let signals_height = 33.0;
        let stats_height = height_mm - snapshot_height - signals_height - 6.0;

        self.draw_card(x_mm, y_mm, width_mm, snapshot_height, Some(rgb(0.992, 0.968, 0.952)));
        self.draw_wrapped_text_at(
            "Child snapshot",
            x_mm + 4.0,
            y_mm + 4.8,
            width_mm - 8.0,
            8.0,
            BuiltinFont::HelveticaBold,
            rgb(0.66, 0.50, 0.39),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&payload.patient_summary),
            x_mm + 4.0,
            y_mm + 11.0,
            width_mm - 8.0,
            8.4,
            BuiltinFont::Helvetica,
            gray(0.23),
        );

        let signals_y = y_mm + snapshot_height + 3.0;
        self.draw_card(x_mm, signals_y, width_mm, signals_height, Some(rgb(0.994, 0.995, 0.998)));
        self.draw_wrapped_text_at(
            "Key signals",
            x_mm + 4.0,
            signals_y + 4.5,
            width_mm - 8.0,
            8.2,
            BuiltinFont::HelveticaBold,
            gray(0.16),
        );

        let mut chip_y = signals_y + 11.0;
        for chip in payload.attention_chips.iter().take(3) {
            let fill = match chip.tone.as_str() {
                "alert" => rgb(1.0, 0.91, 0.89),
                "caution" => rgb(1.0, 0.95, 0.85),
                _ => rgb(0.93, 0.95, 0.99),
            };
            self.draw_card(x_mm + 4.0, chip_y, width_mm - 8.0, 6.5, Some(fill));
            self.draw_wrapped_text_at(
                &sanitize_text(&chip.text),
                x_mm + 6.0,
                chip_y + 2.3,
                width_mm - 12.0,
                5.8,
                BuiltinFont::HelveticaBold,
                gray(0.28),
            );
            chip_y += 7.4;
        }

        let stats_y = signals_y + signals_height + 3.0;
        self.draw_card(x_mm, stats_y, width_mm, stats_height, Some(rgb(0.999, 0.999, 0.998)));
        self.draw_wrapped_text_at(
            "At a glance",
            x_mm + 4.0,
            stats_y + 4.5,
            width_mm - 8.0,
            8.2,
            BuiltinFont::HelveticaBold,
            gray(0.16),
        );

        let mut row_y = stats_y + 11.0;
        for stat in payload.dashboard_stats.iter().take(4) {
            self.draw_wrapped_text_at(
                &sanitize_text(&stat.label),
                x_mm + 4.0,
                row_y,
                width_mm - 22.0,
                6.5,
                BuiltinFont::Helvetica,
                gray(0.46),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&stat.value),
                x_mm + width_mm - 16.0,
                row_y - 0.3,
                12.0,
                8.4,
                BuiltinFont::HelveticaBold,
                gray(0.12),
            );
            row_y += 8.8;
        }

        Ok(())
    }

    fn draw_hero_chart(
        &mut self,
        chart: &ReportPdfChart,
        x_mm: f32,
        y_mm: f32,
        width_mm: f32,
        height_mm: f32,
    ) -> Result<(), String> {
        let plot_top = y_mm + 10.0;
        let plot_height = height_mm - 24.0;
        let plot_width = width_mm - 8.0;
        let start_x = x_mm + 4.0;
        let max_value = chart
            .points
            .iter()
            .map(|point| point.primary_value.max(point.secondary_value.unwrap_or(0)))
            .max()
            .unwrap_or(0)
            .max(1) as f32;

        self.draw_wrapped_text_at(
            &sanitize_text(&chart.title),
            x_mm,
            y_mm,
            width_mm,
            8.8,
            BuiltinFont::HelveticaBold,
            gray(0.36),
        );

        for step in 0..=4 {
            let y = plot_top + (plot_height / 4.0) * step as f32;
            self.draw_line(start_x, y, start_x + plot_width, y, gray(0.91), 0.6);
        }

        let group_width = plot_width / chart.points.len().max(1) as f32;
        let mut previous_line: Option<(f32, f32)> = None;

        for (index, point) in chart.points.iter().enumerate() {
            let group_x = start_x + group_width * index as f32;
            let primary_height = (point.primary_value as f32 / max_value) * (plot_height - 6.0);
            let secondary_height =
                (point.secondary_value.unwrap_or(0) as f32 / max_value) * (plot_height - 6.0);
            let bar_width = (group_width * 0.36).max(3.0);
            let bar_x = group_x + group_width * 0.18;
            let bar_y = plot_top + (plot_height - primary_height);

            self.draw_filled_rect(
                bar_x,
                bar_y,
                bar_width,
                primary_height.max(1.2),
                rgb(0.24, 0.45, 0.92),
            );

            if point.secondary_value.unwrap_or(0) > 0 {
                let line_x = group_x + group_width * 0.70;
                let line_y = plot_top + (plot_height - secondary_height);
                if let Some((prev_x, prev_y)) = previous_line {
                    self.draw_line(prev_x, prev_y, line_x, line_y, rgb(0.92, 0.61, 0.47), 1.2);
                }
                self.draw_circle(line_x, line_y, 1.2, rgb(0.92, 0.61, 0.47));
                previous_line = Some((line_x, line_y));
            }

            self.draw_wrapped_text_at(
                &sanitize_text(&point.label),
                group_x,
                y_mm + height_mm - 9.0,
                group_width,
                6.4,
                BuiltinFont::Helvetica,
                gray(0.46),
            );
        }

        self.draw_wrapped_text_at(
            &sanitize_text(&chart.primary_label),
            x_mm,
            y_mm + height_mm - 3.2,
            width_mm * 0.45,
            6.4,
            BuiltinFont::Helvetica,
            gray(0.36),
        );
        if let Some(label) = &chart.secondary_label {
            self.draw_wrapped_text_at(
                &sanitize_text(label),
                x_mm + width_mm * 0.52,
                y_mm + height_mm - 3.2,
                width_mm * 0.45,
                6.4,
                BuiltinFont::Helvetica,
                rgb(0.92, 0.61, 0.47),
            );
        }

        Ok(())
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

    fn draw_chart_grid(
        &mut self,
        heading: &str,
        charts: &[ReportPdfChart],
        columns: usize,
        chart_height: f32,
    ) -> Result<(), String> {
        if charts.is_empty() {
            return Ok(());
        }

        self.draw_section_heading(heading)?;
        let gap_mm = 4.0;
        let chart_width =
            (CONTENT_WIDTH_MM - gap_mm * (columns.saturating_sub(1) as f32)) / columns as f32;
        let rows = (charts.len() + columns - 1) / columns;
        let total_height = rows as f32 * chart_height + rows.saturating_sub(1) as f32 * gap_mm;
        self.ensure_space(total_height);

        for (index, chart) in charts.iter().enumerate() {
            let row = index / columns;
            let col = index % columns;
            let x = MARGIN_LEFT_MM + col as f32 * (chart_width + gap_mm);
            let y = self.y_mm + row as f32 * (chart_height + gap_mm);
            self.draw_chart_card(chart, x, y, chart_width, chart_height)?;
        }

        self.y_mm += total_height + 2.0;
        Ok(())
    }

    fn draw_summary_cards(&mut self, cards: &[ReportPdfSummaryCard]) -> Result<(), String> {
        if cards.is_empty() {
            return Ok(());
        }

        self.draw_section_heading("Summary by domain")?;
        let columns = 2usize;
        let gap_mm = 4.0;
        let card_width = (CONTENT_WIDTH_MM - gap_mm) / 2.0;
        let card_height = 22.0;
        let rows = (cards.len() + columns - 1) / columns;
        let total_height = rows as f32 * card_height + rows.saturating_sub(1) as f32 * gap_mm;
        self.ensure_space(total_height);

        for (index, card) in cards.iter().enumerate() {
            let row = index / columns;
            let col = index % columns;
            let x = MARGIN_LEFT_MM + col as f32 * (card_width + gap_mm);
            let y = self.y_mm + row as f32 * (card_height + gap_mm);
            let fill = match card.tone.as_str() {
                "alert" => rgb(1.0, 0.95, 0.94),
                "caution" => rgb(1.0, 0.97, 0.91),
                "healthy" => rgb(0.94, 0.98, 0.95),
                "info" => rgb(0.95, 0.97, 1.0),
                _ => rgb(0.99, 0.99, 0.99),
            };
            self.draw_card(x, y, card_width, card_height, Some(fill));
            self.draw_wrapped_text_at(
                &sanitize_text(&card.title),
                x + 3.0,
                y + 3.8,
                card_width - 6.0,
                7.8,
                BuiltinFont::HelveticaBold,
                gray(0.45),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&card.value),
                x + 3.0,
                y + 8.6,
                card_width - 6.0,
                11.2,
                BuiltinFont::HelveticaBold,
                rgb(0.27, 0.22, 0.18),
            );
            self.draw_wrapped_text_at(
                &sanitize_text(&card.detail),
                x + 3.0,
                y + 14.0,
                card_width - 6.0,
                6.8,
                BuiltinFont::Helvetica,
                gray(0.38),
            );
        }

        self.y_mm += total_height + 1.0;
        Ok(())
    }

    fn draw_chart_card(
        &mut self,
        chart: &ReportPdfChart,
        x_mm: f32,
        y_mm: f32,
        width_mm: f32,
        height_mm: f32,
    ) -> Result<(), String> {
        self.draw_card(x_mm, y_mm, width_mm, height_mm, Some(rgb(0.997, 0.996, 0.994)));
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
                let center_y =
                    chart_inner_top + (chart_inner_height - (point.primary_value as f32 / max_value) * chart_inner_height);
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
            1.8,
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

        for row in &section.rows {
            let row_height = self.measure_context_row_height(row);
            self.ensure_space(row_height);
            self.draw_wrapped_text_at(
                &sanitize_text(&row.title),
                MARGIN_LEFT_MM + 3.0,
                self.y_mm + 3.8,
                CONTENT_WIDTH_MM - 6.0,
                9.5,
                BuiltinFont::HelveticaBold,
                gray(0.16),
            );

            let mut next_y = self.y_mm + 8.8;
            if let Some(meta) = &row.meta {
                self.draw_wrapped_text_at(
                    &sanitize_text(meta),
                    MARGIN_LEFT_MM + 3.0,
                    next_y,
                    CONTENT_WIDTH_MM - 6.0,
                    8.4,
                    BuiltinFont::Helvetica,
                    gray(0.48),
                );
                next_y += line_block_height(meta, CONTENT_WIDTH_MM - 6.0, 8.4) + 1.0;
            }
            if let Some(detail) = &row.detail {
                self.draw_wrapped_text_at(
                    &sanitize_text(detail),
                    MARGIN_LEFT_MM + 3.0,
                    next_y,
                    CONTENT_WIDTH_MM - 6.0,
                    8.8,
                    BuiltinFont::Helvetica,
                    gray(0.32),
                );
            }

            self.y_mm += row_height + 2.0;
        }

        Ok(())
    }

    fn draw_timeline_header(&mut self) {
        let header_height = 10.0;
        self.ensure_space(header_height + 2.0);
        self.draw_card(MARGIN_LEFT_MM, self.y_mm, CONTENT_WIDTH_MM, header_height, Some(gray(0.96)));
        self.draw_wrapped_text_at("Date / Time", MARGIN_LEFT_MM + 2.5, self.y_mm + 3.2, 30.0, 8.2, BuiltinFont::HelveticaBold, gray(0.18));
        self.draw_wrapped_text_at("Event", MARGIN_LEFT_MM + 33.0, self.y_mm + 3.2, 24.0, 8.2, BuiltinFont::HelveticaBold, gray(0.18));
        self.draw_wrapped_text_at("Details", MARGIN_LEFT_MM + 59.0, self.y_mm + 3.2, 76.0, 8.2, BuiltinFont::HelveticaBold, gray(0.18));
        self.draw_wrapped_text_at("Parent Note", MARGIN_LEFT_MM + 137.0, self.y_mm + 3.2, 39.0, 8.2, BuiltinFont::HelveticaBold, gray(0.18));
        self.y_mm += header_height + 1.5;
    }

    fn draw_timeline_row(&mut self, row: &ReportPdfTimelineRow, _zebra: bool) -> Result<(), String> {
        let height = self.measure_timeline_row_height(row);

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
            MARGIN_LEFT_MM + 33.0,
            self.y_mm + 3.0,
            24.0,
            8.0,
            BuiltinFont::HelveticaBold,
            gray(0.16),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(&row.details),
            MARGIN_LEFT_MM + 59.0,
            self.y_mm + 3.0,
            76.0,
            8.0,
            BuiltinFont::Helvetica,
            gray(0.24),
        );
        self.draw_wrapped_text_at(
            &sanitize_text(row.note.as_deref().unwrap_or("-")),
            MARGIN_LEFT_MM + 137.0,
            self.y_mm + 3.0,
            39.0,
            8.0,
            BuiltinFont::Helvetica,
            gray(0.34),
        );

        self.y_mm += height + 1.0;
        Ok(())
    }

    fn measure_context_row_height(&self, row: &ReportPdfSectionRow) -> f32 {
        let mut height = 8.0;
        height += line_block_height(&row.title, CONTENT_WIDTH_MM - 6.0, 9.5);
        if let Some(meta) = &row.meta {
            height += line_block_height(meta, CONTENT_WIDTH_MM - 6.0, 8.4) + 1.0;
        }
        if let Some(detail) = &row.detail {
            height += line_block_height(detail, CONTENT_WIDTH_MM - 6.0, 8.8);
        }
        height.max(16.0)
    }

    fn measure_timeline_row_height(&self, row: &ReportPdfTimelineRow) -> f32 {
        let left = line_block_height(&row.date_time, 30.0, 8.0);
        let event = line_block_height(&row.event_type, 24.0, 8.0);
        let details = line_block_height(&row.details, 76.0, 8.0);
        let note = line_block_height(row.note.as_deref().unwrap_or("-"), 39.0, 8.0);
        (left.max(event).max(details).max(note) + 6.0).max(12.0)
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
        self.draw_wrapped_text_at(text, x_mm, self.y_mm, max_width_mm, font_size_pt, font, color);
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
            let lines = if lines.is_empty() { vec![String::new()] } else { lines };
            for line in lines {
                self.ops.extend(text_ops(&line, x_mm, y, font_size_pt, font, color.clone()));
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
            polygon: top_rect(x_mm, y_from_top_mm, width_mm, height_mm, PaintMode::FillStroke)
                .to_polygon(),
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
        self.ops.push(Op::SetOutlineThickness { pt: Pt(thickness_pt) });
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

    fn draw_circle(&mut self, center_x_mm: f32, center_y_from_top_mm: f32, radius_mm: f32, color: Color) {
        let points = circle_points(center_x_mm, center_y_from_top_mm, radius_mm, 18);
        self.ops.push(Op::SetFillColor { col: color });
        self.ops.push(Op::DrawPolygon {
            polygon: polygon_from_top_points(points, PaintMode::Fill),
        });
    }

    fn draw_logo_mark(&mut self, x_mm: f32, y_from_top_mm: f32) {
        self.draw_filled_rect(x_mm, y_from_top_mm, 12.0, 12.0, rgb(1.0, 0.94, 0.90));
        self.draw_circle(x_mm + 6.0, y_from_top_mm + 5.3, 3.2, rgb(1.0, 0.84, 0.72));
        self.draw_circle(x_mm + 6.0, y_from_top_mm + 7.0, 2.2, rgb(0.98, 0.74, 0.58));
        self.draw_circle(x_mm + 4.8, y_from_top_mm + 4.8, 0.35, rgb(0.36, 0.25, 0.20));
        self.draw_circle(x_mm + 7.2, y_from_top_mm + 4.8, 0.35, rgb(0.36, 0.25, 0.20));
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
        Op::SetFillColor { col: gray(1.0) },
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

fn polygon_from_top_points(points: Vec<(f32, f32)>, mode: PaintMode) -> printpdf::graphics::Polygon {
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

fn circle_points(center_x_mm: f32, center_y_from_top_mm: f32, radius_mm: f32, segments: usize) -> Vec<(f32, f32)> {
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
        .map(|paragraph| wrap_text(paragraph, max_width_mm, font_size_pt).len().max(1))
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
            title: "Pediatrician Summary".to_string(),
            subtitle: "2026-03-01 to 2026-03-31".to_string(),
            generated_at_label: "Generated by Tiny Tummy on 2026-03-31".to_string(),
            patient_summary: "Sam · DOB 2025-09-30 · 6 months old · Diet mixed".to_string(),
            attention_chips: vec![ReportPdfChip {
                tone: "caution".to_string(),
                text: "No-poop streak recorded".to_string(),
            }],
            dashboard_stats: vec![
                ReportPdfStat {
                    label: "Avg stools / day".to_string(),
                    value: "1.2".to_string(),
                    _detail: Some("36 stools logged".to_string()),
                },
                ReportPdfStat {
                    label: "Longest no-poop streak".to_string(),
                    value: "2d".to_string(),
                    _detail: Some("Based on marked no-poop days".to_string()),
                },
            ],
            summary_cards: vec![ReportPdfSummaryCard {
                title: "Stool pattern".to_string(),
                value: "6 stools".to_string(),
                detail: "Most common type 4 · Most common color yellow".to_string(),
                tone: "healthy".to_string(),
            }],
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
