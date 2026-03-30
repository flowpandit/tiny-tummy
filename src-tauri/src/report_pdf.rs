use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use printpdf::{
    graphics::{PaintMode, Polygon},
    ops::PdfFontHandle,
    BuiltinFont, Color, Mm, Op, PdfDocument, PdfPage, PdfSaveOptions, Point, Pt, RawImage, Rgb,
    TextItem, WindingOrder, XObjectTransform,
};
use serde::Deserialize;

const PAGE_WIDTH_MM: f32 = 210.0;
const PAGE_HEIGHT_MM: f32 = 297.0;
const MARGIN_LEFT_MM: f32 = 16.0;
const MARGIN_RIGHT_MM: f32 = 16.0;
const MARGIN_TOP_MM: f32 = 18.0;
const MARGIN_BOTTOM_MM: f32 = 18.0;
const CONTENT_WIDTH_MM: f32 = PAGE_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPdfPayload {
    pub title: String,
    pub subtitle: String,
    pub generated_at_label: String,
    pub stats: Vec<ReportPdfStat>,
    pub highlights: Vec<ReportPdfHighlight>,
    pub sections: Vec<ReportPdfSection>,
}

#[derive(Debug, Deserialize)]
pub struct ReportPdfStat {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct ReportPdfHighlight {
    pub title: String,
    pub detail: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPdfSection {
    pub title: String,
    pub empty_text: String,
    pub entries: Vec<ReportPdfEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPdfEntry {
    pub title: String,
    pub meta: Option<String>,
    pub body: Option<String>,
    pub image_data_url: Option<String>,
}

pub fn generate_report_pdf(payload: ReportPdfPayload) -> Result<String, String> {
    let mut layout = PdfLayout::new(&payload.title);

    layout.draw_title(&payload.title)?;
    layout.draw_wrapped_text(
        &payload.subtitle,
        MARGIN_LEFT_MM,
        CONTENT_WIDTH_MM,
        11.0,
        BuiltinFont::Helvetica,
        rgb(0.30, 0.35, 0.45),
        5.0,
    )?;
    layout.draw_wrapped_text(
        &payload.generated_at_label,
        MARGIN_LEFT_MM,
        CONTENT_WIDTH_MM,
        9.0,
        BuiltinFont::Helvetica,
        rgb(0.47, 0.51, 0.59),
        7.0,
    )?;

    layout.draw_section_heading("Summary")?;
    for stat in payload.stats {
        let stat_line = format!("{}: {}", sanitize_text(&stat.label), sanitize_text(&stat.value));
        layout.draw_wrapped_text(
            &stat_line,
            MARGIN_LEFT_MM,
            CONTENT_WIDTH_MM,
            11.0,
            BuiltinFont::Helvetica,
            rgb(0.15, 0.19, 0.25),
            2.4,
        )?;
    }
    layout.add_gap(5.0);

    layout.draw_section_heading("Highlights")?;
    for highlight in payload.highlights {
        let title = format!("- {}", sanitize_text(&highlight.title));
        layout.draw_wrapped_text(
            &title,
            MARGIN_LEFT_MM,
            CONTENT_WIDTH_MM,
            11.0,
            BuiltinFont::HelveticaBold,
            rgb(0.15, 0.19, 0.25),
            1.8,
        )?;
        layout.draw_wrapped_text(
            &highlight.detail,
            MARGIN_LEFT_MM + 4.0,
            CONTENT_WIDTH_MM - 4.0,
            10.0,
            BuiltinFont::Helvetica,
            rgb(0.30, 0.35, 0.45),
            3.4,
        )?;
    }

    for section in payload.sections {
        layout.draw_section_heading(&section.title)?;

        if section.entries.is_empty() {
            layout.draw_wrapped_text(
                &section.empty_text,
                MARGIN_LEFT_MM,
                CONTENT_WIDTH_MM,
                10.0,
                BuiltinFont::HelveticaOblique,
                rgb(0.47, 0.51, 0.59),
                6.0,
            )?;
            continue;
        }

        for entry in section.entries {
            layout.draw_entry(&entry)?;
        }
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
            let footer = format!("Page {}", index + 1);
            page.ops.extend(text_ops(
                &footer,
                MARGIN_LEFT_MM,
                PAGE_HEIGHT_MM - 10.0,
                8.0,
                BuiltinFont::Helvetica,
                rgb(0.47, 0.51, 0.59),
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

    fn draw_title(&mut self, title: &str) -> Result<(), String> {
        self.draw_wrapped_text(
            title,
            MARGIN_LEFT_MM,
            CONTENT_WIDTH_MM,
            22.0,
            BuiltinFont::HelveticaBold,
            rgb(0.12, 0.16, 0.23),
            6.0,
        )
    }

    fn draw_section_heading(&mut self, heading: &str) -> Result<(), String> {
        if self.y_mm > MARGIN_TOP_MM + 2.0 {
            self.add_gap(2.0);
        }

        self.draw_wrapped_text(
            heading,
            MARGIN_LEFT_MM,
            CONTENT_WIDTH_MM,
            15.0,
            BuiltinFont::HelveticaBold,
            rgb(0.12, 0.16, 0.23),
            3.5,
        )
    }

    fn draw_entry(&mut self, entry: &ReportPdfEntry) -> Result<(), String> {
        self.draw_wrapped_text(
            &entry.title,
            MARGIN_LEFT_MM,
            CONTENT_WIDTH_MM,
            11.0,
            BuiltinFont::HelveticaBold,
            rgb(0.15, 0.19, 0.25),
            1.6,
        )?;

        if let Some(meta) = &entry.meta {
            self.draw_wrapped_text(
                meta,
                MARGIN_LEFT_MM,
                CONTENT_WIDTH_MM,
                9.0,
                BuiltinFont::Helvetica,
                rgb(0.47, 0.51, 0.59),
                1.8,
            )?;
        }

        if let Some(image_data_url) = &entry.image_data_url {
            self.draw_image_block(image_data_url)?;
        }

        if let Some(body) = &entry.body {
            self.draw_wrapped_text(
                body,
                MARGIN_LEFT_MM,
                CONTENT_WIDTH_MM,
                10.0,
                BuiltinFont::Helvetica,
                rgb(0.30, 0.35, 0.45),
                2.4,
            )?;
        }

        self.add_gap(4.5);
        Ok(())
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
        let line_height_mm = pt_to_mm(font_size_pt * 1.35);
        let sanitized = sanitize_text(text);

        for paragraph in sanitized.split('\n') {
            let lines = wrap_text(paragraph, max_width_mm, font_size_pt);
            let normalized_lines = if lines.is_empty() {
                vec![String::new()]
            } else {
                lines
            };

            for line in normalized_lines {
                self.ensure_space(line_height_mm + 1.0);
                self.ops
                    .extend(text_ops(&line, x_mm, self.y_mm, font_size_pt, font, color.clone()));
                self.y_mm += line_height_mm;
            }

            self.y_mm += 0.8;
        }

        self.y_mm += gap_after_mm;
        Ok(())
    }

    fn draw_image_block(&mut self, image_data_url: &str) -> Result<(), String> {
        let bytes = decode_data_url(image_data_url)?;
        let mut warnings = Vec::new();
        let image = RawImage::decode_from_bytes(&bytes, &mut warnings)
            .map_err(|err| format!("Failed to decode report image: {err}"))?;

        let width_px = image.width as f32;
        let height_px = image.height as f32;
        if width_px <= 0.0 || height_px <= 0.0 {
            return Ok(());
        }

        let max_width_mm = 64.0;
        let max_height_mm = 64.0;
        let aspect = width_px / height_px;
        let mut draw_width_mm = max_width_mm;
        let mut draw_height_mm = draw_width_mm / aspect;

        if draw_height_mm > max_height_mm {
            draw_height_mm = max_height_mm;
            draw_width_mm = draw_height_mm * aspect;
        }

        self.ensure_space(draw_height_mm + 4.0);

        let image_id = self.doc.add_image(&image);
        let width_pt_at_300dpi = width_px * 72.0 / 300.0;
        let height_pt_at_300dpi = height_px * 72.0 / 300.0;
        let target_width_pt = draw_width_mm * 72.0 / 25.4;
        let target_height_pt = draw_height_mm * 72.0 / 25.4;

        self.ops.push(Op::UseXobject {
            id: image_id,
            transform: XObjectTransform {
                translate_x: Some(Mm(MARGIN_LEFT_MM).into()),
                translate_y: Some(Mm(PAGE_HEIGHT_MM - self.y_mm - draw_height_mm).into()),
                rotate: None,
                scale_x: Some(target_width_pt / width_pt_at_300dpi),
                scale_y: Some(target_height_pt / height_pt_at_300dpi),
                dpi: Some(300.0),
            },
        });

        self.y_mm += draw_height_mm + 3.0;
        Ok(())
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
    let mut polygon: Polygon = vec![
        (Point::new(Mm(0.0), Mm(0.0)), false),
        (Point::new(Mm(PAGE_WIDTH_MM), Mm(0.0)), false),
        (Point::new(Mm(PAGE_WIDTH_MM), Mm(PAGE_HEIGHT_MM)), false),
        (Point::new(Mm(0.0), Mm(PAGE_HEIGHT_MM)), false),
    ]
    .into_iter()
    .collect();
    polygon.mode = PaintMode::Fill;
    polygon.winding_order = WindingOrder::NonZero;

    vec![
        Op::SetFillColor {
            col: rgb(1.0, 1.0, 1.0),
        },
        Op::DrawPolygon {
            polygon,
        },
    ]
}

fn wrap_text(text: &str, max_width_mm: f32, font_size_pt: f32) -> Vec<String> {
    let cleaned = text.trim();
    if cleaned.is_empty() {
        return Vec::new();
    }

    let approx_char_width_mm = (font_size_pt * 0.52) * 25.4 / 72.0;
    let max_chars = ((max_width_mm / approx_char_width_mm).floor() as usize).max(12);
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

fn decode_data_url(data_url: &str) -> Result<Vec<u8>, String> {
    let (_, encoded) = data_url
        .split_once(',')
        .ok_or_else(|| "Invalid image data URL".to_string())?;
    STANDARD
        .decode(encoded)
        .map_err(|err| format!("Invalid image base64: {err}"))
}

fn rgb(r: f32, g: f32, b: f32) -> Color {
    Color::Rgb(Rgb::new(r, g, b, None))
}

fn pt_to_mm(pt: f32) -> f32 {
    pt * 25.4 / 72.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_a_valid_pdf() {
        let icon_data_url = format!(
            "data:image/png;base64,{}",
            STANDARD.encode(include_bytes!("../icons/32x32.png"))
        );

        let payload = ReportPdfPayload {
            title: "Tiny Tummy Report".to_string(),
            subtitle: "6 months old - 2026-03-01 to 2026-03-31".to_string(),
            generated_at_label: "Generated by Tiny Tummy on 2026-03-31".to_string(),
            stats: vec![
                ReportPdfStat {
                    label: "Total poops".to_string(),
                    value: "12".to_string(),
                },
                ReportPdfStat {
                    label: "Avg per day".to_string(),
                    value: "0.4".to_string(),
                },
            ],
            highlights: vec![ReportPdfHighlight {
                title: "No major changes highlighted".to_string(),
                detail: "This period does not include red-flag colors.".to_string(),
            }],
            sections: vec![
                ReportPdfSection {
                    title: "Log Entries (1)".to_string(),
                    empty_text: "No entries in this date range.".to_string(),
                    entries: vec![ReportPdfEntry {
                        title: "Type 4: Soft".to_string(),
                        meta: Some("Mar 12, 9:20 AM".to_string()),
                        body: Some("Color: Yellow - Medium".to_string()),
                        image_data_url: None,
                    }],
                },
                ReportPdfSection {
                    title: "Photos".to_string(),
                    empty_text: "No photos in this date range.".to_string(),
                    entries: vec![ReportPdfEntry {
                        title: "Mar 12, 9:20 AM".to_string(),
                        meta: Some("Type 4".to_string()),
                        body: Some("Color: Yellow".to_string()),
                        image_data_url: Some(icon_data_url),
                    }],
                },
            ],
        };

        let encoded = generate_report_pdf(payload).expect("pdf should generate");
        let bytes = STANDARD.decode(encoded).expect("should decode pdf bytes");
        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 1000);

        let output = std::env::temp_dir().join("tiny-tummy-report-test.pdf");
        std::fs::write(output, bytes).expect("should write pdf");
    }
}
