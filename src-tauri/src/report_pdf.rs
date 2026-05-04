use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use printpdf::{
    graphics::{Line, LinePoint, PaintMode, Point, Polygon, PolygonRing, WindingOrder},
    ops::PdfFontHandle,
    BuiltinFont, Color, Mm, Op, PdfDocument, PdfPage, PdfSaveOptions, Pt, Px, RawImage, Rgb,
    TextItem, XObjectId, XObjectTransform,
};
use serde::Deserialize;

const PAGE_WIDTH_MM: f32 = 210.0;
const PAGE_HEIGHT_MM: f32 = 297.0;
const PAGE_PAD_X_MM: f32 = 13.0;
const PAGE_PAD_TOP_MM: f32 = 10.5;
const CONTENT_BOTTOM_MM: f32 = 264.0;
const FOOTER_TOP_MM: f32 = 276.0;
const CONTENT_WIDTH_MM: f32 = PAGE_WIDTH_MM - (PAGE_PAD_X_MM * 2.0);
const CARD_RADIUS_MM: f32 = 2.4;

static BRAND_ICON_PNG: &[u8] = include_bytes!("../assets/report-icons/brand.png");
static POOP_ICON_PNG: &[u8] = include_bytes!("../assets/report-icons/poop.png");
static DIAPER_ICON_PNG: &[u8] = include_bytes!("../assets/report-icons/diaper.png");
static DIAPER_WET_ICON_PNG: &[u8] = include_bytes!("../assets/report-icons/diaper-wet.png");
static DIAPER_DIRTY_ICON_PNG: &[u8] = include_bytes!("../assets/report-icons/diaper-dirty.png");
static DIAPER_MIXED_ICON_PNG: &[u8] = include_bytes!("../assets/report-icons/diaper-mixed.png");
static FEED_ICON_PNG: &[u8] = include_bytes!("../assets/report-icons/feed.png");
static BREASTFEED_ICON_PNG: &[u8] = include_bytes!("../assets/report-icons/breastfeed.png");
static SYMPTOM_ICON_PNG: &[u8] = include_bytes!("../assets/report-icons/symptom.png");
static EPISODE_ICON_PNG: &[u8] = include_bytes!("../assets/report-icons/episode.png");

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NativeReportPdfPayload {
    pub title: String,
    pub child_name: String,
    pub child_avatar_color: String,
    #[serde(default)]
    pub child_avatar_data_url: Option<String>,
    pub age_label: String,
    pub dob_label: String,
    pub feeding_label: String,
    pub period_label: String,
    pub generated_label: String,
    pub disclaimer: String,
    pub privacy_footer: String,
    pub brief: BriefModel,
    pub pattern: PatternModel,
    pub context: ContextModel,
    #[serde(default)]
    pub timeline_groups: Vec<TimelineGroup>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BriefModel {
    pub summary: String,
    #[serde(default)]
    pub concerns: Vec<BriefRow>,
    #[serde(default)]
    pub questions: Vec<String>,
    #[serde(default)]
    pub last_important_events: Vec<ReportEvent>,
    #[serde(default)]
    pub metrics: Vec<Metric>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PatternModel {
    #[serde(default)]
    pub metrics: Vec<Metric>,
    #[serde(default)]
    pub daily_points: Vec<DailyPoint>,
    #[serde(default)]
    pub no_poop_dates: Vec<String>,
    #[serde(default)]
    pub stool_type_trend: Vec<TypeTrendPoint>,
    #[serde(default)]
    pub colour_breakdown: Vec<ColourBreakdownItem>,
    #[serde(default)]
    pub hydration_rows: Vec<InfoRow>,
    #[serde(default)]
    pub clinical_notes: Vec<ClinicalNote>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ContextModel {
    #[serde(default)]
    pub care_notes: Vec<InfoRow>,
    #[serde(default)]
    pub poop_summary_rows: Vec<InfoRow>,
    #[serde(default)]
    pub diaper_rows: Vec<InfoRow>,
    #[serde(default)]
    pub episode_rows: Vec<InfoRow>,
    #[serde(default)]
    pub symptom_rows: Vec<SymptomSummaryRow>,
    #[serde(default)]
    pub feeding_rows: Vec<FeedingSummaryRow>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct BriefRow {
    pub label: String,
    pub value: String,
    pub detail: String,
    pub tone: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Metric {
    pub label: String,
    pub value: String,
    pub tone: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ReportEvent {
    pub label: String,
    pub value: String,
    pub detail: String,
    pub tone: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DailyPoint {
    pub weekday: String,
    pub date_label: String,
    pub stool_count: u32,
    pub no_poop_count: u32,
    pub wet_only: u32,
    pub dirty_only: u32,
    pub mixed: u32,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TypeTrendPoint {
    pub date_label: String,
    pub label: String,
    pub tone: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ColourBreakdownItem {
    pub label: String,
    pub value: String,
    pub count: u32,
    pub percent: u32,
    pub color: String,
    pub is_red_flag: bool,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ClinicalNote {
    pub topic: String,
    pub note: String,
    pub tone: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct InfoRow {
    pub label: String,
    pub value: String,
    #[serde(default)]
    pub detail: Option<String>,
    #[serde(default)]
    pub tone: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SymptomSummaryRow {
    pub symptom: String,
    pub severity_score: u32,
    pub latest: String,
    pub note: String,
    pub tone: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct FeedingSummaryRow {
    pub r#type: String,
    pub entries: String,
    pub notes: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TimelineGroup {
    pub date_label: String,
    #[serde(default)]
    pub rows: Vec<TimelineRow>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TimelineRow {
    pub time: String,
    pub event: String,
    pub details: String,
    pub note: String,
    pub tone: String,
}

#[tauri::command]
pub fn generate_native_report_pdf(payload: NativeReportPdfPayload) -> Result<String, String> {
    let mut layout = PdfLayout::new(&payload);
    layout.draw_report(&payload)?;
    Ok(STANDARD.encode(layout.finish()))
}

#[derive(Clone)]
struct PatientHeader {
    child_name: String,
    child_initial: String,
    child_avatar_color: Color,
    child_avatar_image: Option<PdfAsset>,
    dob_label: String,
    age_label: String,
    feeding_label: String,
    privacy_footer: String,
}

#[derive(Clone)]
struct PageContext {
    title: String,
    subtitle: Option<String>,
}

struct PdfLayout {
    doc: PdfDocument,
    pages: Vec<PdfPage>,
    ops: Vec<Op>,
    y_mm: f32,
    has_content: bool,
    assets: PdfAssets,
    patient: PatientHeader,
    page_context: Option<PageContext>,
}

#[derive(Clone)]
struct PdfAsset {
    id: XObjectId,
    width_px: usize,
    height_px: usize,
    dpi: f32,
}

#[derive(Default)]
struct PdfAssets {
    brand: Option<PdfAsset>,
    poop: Option<PdfAsset>,
    diaper: Option<PdfAsset>,
    diaper_wet: Option<PdfAsset>,
    diaper_dirty: Option<PdfAsset>,
    diaper_mixed: Option<PdfAsset>,
    feed: Option<PdfAsset>,
    breastfeed: Option<PdfAsset>,
    symptom: Option<PdfAsset>,
    episode: Option<PdfAsset>,
}

#[derive(Clone, Copy)]
enum ReportIcon {
    Brand,
    Poop,
    Diaper,
    DiaperWet,
    DiaperDirty,
    DiaperMixed,
    Feed,
    Breastfeed,
    Symptom,
    Episode,
}

enum ImageFit {
    Contain,
    Cover,
}

impl PdfAssets {
    fn register(doc: &mut PdfDocument) -> Self {
        Self {
            brand: register_png_asset(doc, BRAND_ICON_PNG),
            poop: register_png_asset(doc, POOP_ICON_PNG),
            diaper: register_png_asset(doc, DIAPER_ICON_PNG),
            diaper_wet: register_png_asset(doc, DIAPER_WET_ICON_PNG),
            diaper_dirty: register_png_asset(doc, DIAPER_DIRTY_ICON_PNG),
            diaper_mixed: register_png_asset(doc, DIAPER_MIXED_ICON_PNG),
            feed: register_png_asset(doc, FEED_ICON_PNG),
            breastfeed: register_png_asset(doc, BREASTFEED_ICON_PNG),
            symptom: register_png_asset(doc, SYMPTOM_ICON_PNG),
            episode: register_png_asset(doc, EPISODE_ICON_PNG),
        }
    }

    fn get(&self, icon: ReportIcon) -> Option<&PdfAsset> {
        match icon {
            ReportIcon::Brand => self.brand.as_ref(),
            ReportIcon::Poop => self.poop.as_ref(),
            ReportIcon::Diaper => self.diaper.as_ref(),
            ReportIcon::DiaperWet => self.diaper_wet.as_ref(),
            ReportIcon::DiaperDirty => self.diaper_dirty.as_ref(),
            ReportIcon::DiaperMixed => self.diaper_mixed.as_ref(),
            ReportIcon::Feed => self.feed.as_ref(),
            ReportIcon::Breastfeed => self.breastfeed.as_ref(),
            ReportIcon::Symptom => self.symptom.as_ref(),
            ReportIcon::Episode => self.episode.as_ref(),
        }
    }
}

impl PdfLayout {
    fn new(payload: &NativeReportPdfPayload) -> Self {
        let child_initial = payload
            .child_name
            .chars()
            .next()
            .map(|ch| ch.to_uppercase().collect::<String>())
            .unwrap_or_else(|| "T".to_string());
        let mut doc = PdfDocument::new(&payload.title);
        let assets = PdfAssets::register(&mut doc);
        let child_avatar_image = payload
            .child_avatar_data_url
            .as_deref()
            .and_then(|data_url| register_data_url_image(&mut doc, data_url));

        Self {
            doc,
            pages: Vec::new(),
            ops: Vec::new(),
            y_mm: PAGE_PAD_TOP_MM,
            has_content: false,
            assets,
            patient: PatientHeader {
                child_name: payload.child_name.clone(),
                child_initial,
                child_avatar_color: color_from_hex(
                    &payload.child_avatar_color,
                    rgb(0.36, 0.42, 0.32),
                ),
                child_avatar_image,
                dob_label: payload.dob_label.clone(),
                age_label: payload.age_label.clone(),
                feeding_label: payload.feeding_label.clone(),
                privacy_footer: payload.privacy_footer.clone(),
            },
            page_context: None,
        }
    }

    fn draw_report(&mut self, payload: &NativeReportPdfPayload) -> Result<(), String> {
        self.draw_brief_overview(payload)?;
        self.draw_brief_detail(payload)?;
        self.draw_pattern_overview(payload)?;
        self.draw_pattern_detail(payload)?;
        self.draw_context_overview(payload)?;
        self.draw_context_detail(payload)?;
        self.draw_timeline_pages(payload)?;
        Ok(())
    }

    fn finish(mut self) -> Vec<u8> {
        self.finish_page();
        let total_pages = self.pages.len();

        for (index, page) in self.pages.iter_mut().enumerate() {
            page.ops.extend(footer_ops(
                &self.patient.privacy_footer,
                index + 1,
                total_pages,
            ));
        }

        self.doc.with_pages(self.pages);
        let mut warnings = Vec::new();
        self.doc.save(&PdfSaveOptions::default(), &mut warnings)
    }

    fn reset_page(&mut self) {
        self.ops = page_background_ops();
        self.y_mm = PAGE_PAD_TOP_MM;
        self.has_content = false;
    }

    fn finish_page(&mut self) {
        if !self.has_content {
            return;
        }

        let ops = std::mem::take(&mut self.ops);
        self.pages
            .push(PdfPage::new(Mm(PAGE_WIDTH_MM), Mm(PAGE_HEIGHT_MM), ops));
        self.has_content = false;
    }

    fn start_report_page(&mut self, title: &str, subtitle: Option<&str>) {
        self.finish_page();
        self.page_context = Some(PageContext {
            title: title.to_string(),
            subtitle: subtitle.map(str::to_string),
        });
        self.reset_page();
        self.draw_page_header(title, subtitle, false);
    }

    fn continue_report_page(&mut self) {
        let context = self.page_context.clone();
        self.finish_page();
        self.reset_page();

        if let Some(context) = context {
            self.draw_page_header(&context.title, context.subtitle.as_deref(), true);
        }
    }

    fn ensure_space(&mut self, height_mm: f32) {
        if self.y_mm + height_mm > CONTENT_BOTTOM_MM {
            self.continue_report_page();
        }
    }

    fn add_gap(&mut self, gap_mm: f32) {
        self.y_mm += gap_mm;
    }

    fn draw_page_header(&mut self, title: &str, subtitle: Option<&str>, continued: bool) {
        let top = PAGE_PAD_TOP_MM;
        let patient_x = PAGE_WIDTH_MM - PAGE_PAD_X_MM - 44.0;
        let child_initial = self.patient.child_initial.clone();
        let child_name = self.patient.child_name.clone();
        let dob_label = self.patient.dob_label.clone();
        let age_label = self.patient.age_label.clone();
        let feeding_label = self.patient.feeding_label.clone();
        let child_avatar_color = self.patient.child_avatar_color.clone();
        self.draw_text_line(
            "Tiny Tummy",
            PAGE_PAD_X_MM + 10.5,
            top + 6.6,
            15.5,
            BuiltinFont::HelveticaBold,
            leaf(),
        );
        self.draw_icon_tile(
            PAGE_PAD_X_MM,
            top + 1.1,
            8.0,
            ReportIcon::Brand,
            "T",
            "default",
        );

        let title_top = top + 15.0;
        let title_font = 22.0;
        let title_h = self.draw_wrapped_text_at(
            title,
            PAGE_PAD_X_MM,
            title_top,
            128.0,
            title_font,
            BuiltinFont::HelveticaBold,
            ink(),
            Some(2),
        );
        let mut header_cursor = title_top + title_h;
        if continued {
            header_cursor += 1.0;
            self.draw_text_line(
                "continued",
                PAGE_PAD_X_MM,
                header_cursor + 2.7,
                8.2,
                BuiltinFont::HelveticaBold,
                muted(),
            );
            header_cursor += 4.7;
        }
        if let Some(subtitle) = subtitle {
            let subtitle_top = header_cursor + 1.8;
            let subtitle_h = self.draw_wrapped_text_at(
                subtitle,
                PAGE_PAD_X_MM,
                subtitle_top,
                116.0,
                8.8,
                BuiltinFont::Helvetica,
                body(),
                Some(3),
            );
            header_cursor = subtitle_top + subtitle_h;
        } else {
            header_cursor += 0.8;
        }

        self.draw_line(
            patient_x - 4.0,
            top,
            patient_x - 4.0,
            top + 24.0,
            rule(),
            0.35,
        );
        self.draw_patient_avatar(
            patient_x,
            top + 3.1,
            10.8,
            child_avatar_color,
            &child_initial,
        );
        self.draw_text_line(
            &child_name,
            patient_x + 14.0,
            top + 5.4,
            12.0,
            BuiltinFont::HelveticaBold,
            ink(),
        );
        self.draw_text_line(
            &format!("DOB {}", dob_label),
            patient_x + 14.0,
            top + 10.0,
            7.2,
            BuiltinFont::Helvetica,
            body(),
        );
        self.draw_text_line(
            &age_label,
            patient_x + 14.0,
            top + 14.0,
            7.2,
            BuiltinFont::Helvetica,
            body(),
        );
        self.draw_text_line(
            &format!("Feeding {}", feeding_label.to_lowercase()),
            patient_x + 14.0,
            top + 18.0,
            7.2,
            BuiltinFont::Helvetica,
            body(),
        );
        self.draw_line(
            PAGE_PAD_X_MM,
            header_cursor + 4.0,
            PAGE_WIDTH_MM - PAGE_PAD_X_MM,
            header_cursor + 4.0,
            rule(),
            0.35,
        );
        self.y_mm = header_cursor + 9.2;
    }

    fn draw_report_meta(
        &mut self,
        payload: &NativeReportPdfPayload,
        compact: bool,
        note: Option<&str>,
    ) {
        let height = if compact { 15.0 } else { 17.5 };
        let y = self.y_mm;
        let col_w = [54.0, 43.0, CONTENT_WIDTH_MM - 54.0 - 43.0 - 12.0];
        let x0 = PAGE_PAD_X_MM;
        self.draw_badge(x0, y + 1.2, 7.2, "D", "default");
        self.draw_text_line(
            "Report period",
            x0 + 10.0,
            y + 5.0,
            8.2,
            BuiltinFont::HelveticaBold,
            body(),
        );
        self.draw_text_line(
            &payload.period_label,
            x0 + 10.0,
            y + 10.0,
            8.3,
            BuiltinFont::Helvetica,
            ink(),
        );

        let x1 = x0 + col_w[0] + 6.0;
        self.draw_badge(x1, y + 1.2, 7.2, "G", "default");
        self.draw_text_line(
            "Generated",
            x1 + 10.0,
            y + 5.0,
            8.2,
            BuiltinFont::HelveticaBold,
            body(),
        );
        self.draw_wrapped_text_at(
            &payload.generated_label,
            x1 + 10.0,
            y + 6.8,
            col_w[1] - 8.0,
            7.6,
            BuiltinFont::Helvetica,
            ink(),
            Some(2),
        );

        let x2 = x1 + col_w[1] + 6.0;
        self.draw_line(x2 - 3.5, y, x2 - 3.5, y + height - 1.0, rule(), 0.3);
        self.draw_badge(x2, y + 2.2, 5.8, "i", "default");
        self.draw_wrapped_text_at(
            note.unwrap_or(&payload.disclaimer),
            x2 + 8.5,
            y + 1.6,
            col_w[2] - 8.5,
            7.6,
            BuiltinFont::HelveticaOblique,
            body(),
            Some(if compact { 3 } else { 4 }),
        );
        self.draw_line(
            PAGE_PAD_X_MM,
            y + height,
            PAGE_WIDTH_MM - PAGE_PAD_X_MM,
            y + height,
            rule(),
            0.35,
        );
        self.y_mm += height + if compact { 4.0 } else { 4.8 };
    }

    fn draw_brief_overview(&mut self, payload: &NativeReportPdfPayload) -> Result<(), String> {
        self.start_report_page(&payload.title, None);
        self.draw_report_meta(payload, false, None);
        self.draw_brief_hero(&payload.brief.summary)?;
        self.draw_concern_grid(&payload.brief.concerns)?;
        self.draw_section_title("Supporting Metrics", None, "default");
        self.draw_metric_grid(&payload.brief.metrics, 7, 27.0)?;
        Ok(())
    }

    fn draw_brief_detail(&mut self, payload: &NativeReportPdfPayload) -> Result<(), String> {
        self.start_report_page(
            "Pediatrician Brief",
            Some("Recent events and appointment questions from the selected report period."),
        );
        let gap = 3.0;
        let col_w = (CONTENT_WIDTH_MM - gap) / 2.0;
        let left_h = self.measure_event_panel(&payload.brief.last_important_events, col_w);
        let right_h = self.measure_question_panel(&payload.brief.questions, col_w);
        let h = left_h.max(right_h).max(90.0);
        self.ensure_space(h);
        let y = self.y_mm + 1.5;
        self.draw_event_panel(
            PAGE_PAD_X_MM,
            y,
            col_w,
            h,
            &payload.brief.last_important_events,
        )?;
        self.draw_question_panel(
            PAGE_PAD_X_MM + col_w + gap,
            y,
            col_w,
            h,
            &payload.brief.questions,
        )?;
        self.y_mm = y + h + 3.0;
        Ok(())
    }

    fn draw_pattern_overview(&mut self, payload: &NativeReportPdfPayload) -> Result<(), String> {
        self.start_report_page(
            "Poop + Diaper Pattern Review",
            Some("Daily stool output, diaper output, and tummy pattern signals for the selected period."),
        );
        self.add_gap(2.0);
        self.draw_metric_grid(&payload.pattern.metrics, 6, 33.0)?;
        self.add_gap(5.0);
        let gap = 3.5;
        let card_w = (CONTENT_WIDTH_MM - gap) / 2.0;
        let y = self.y_mm;
        self.draw_daily_stool_chart(
            PAGE_PAD_X_MM,
            y,
            card_w,
            76.0,
            &payload.pattern.daily_points,
            &payload.pattern.no_poop_dates,
        )?;
        self.draw_stool_type_trend(
            PAGE_PAD_X_MM + card_w + gap,
            y,
            card_w,
            76.0,
            &payload.pattern.stool_type_trend,
        )?;
        self.y_mm = y + 78.5;
        Ok(())
    }

    fn draw_pattern_detail(&mut self, payload: &NativeReportPdfPayload) -> Result<(), String> {
        self.start_report_page(
            "Poop + Diaper Pattern Review",
            Some("Colour, diaper output, hydration notes, and clinical notes for the selected period."),
        );
        let gap = 3.5;
        let card_w = (CONTENT_WIDTH_MM - gap) / 2.0;
        let chart_y = self.y_mm + 1.5;
        self.draw_colour_breakdown(
            PAGE_PAD_X_MM,
            chart_y,
            card_w,
            76.0,
            &payload.pattern.colour_breakdown,
        )?;
        self.draw_daily_diaper_chart(
            PAGE_PAD_X_MM + card_w + gap,
            chart_y,
            card_w,
            76.0,
            &payload.pattern.daily_points,
        )?;
        self.y_mm = chart_y + 79.5;

        let left_w = 68.0;
        let right_w = CONTENT_WIDTH_MM - left_w - 3.0;
        let left_h =
            self.measure_info_panel("Hydration Notes", &payload.pattern.hydration_rows, left_w);
        let right_h = self.measure_clinical_panel(&payload.pattern.clinical_notes, right_w);
        let h = left_h.max(right_h).max(54.0);
        self.ensure_space(h);
        let y = self.y_mm;
        self.draw_info_panel(
            PAGE_PAD_X_MM,
            y,
            left_w,
            h,
            "Hydration Notes",
            "hydration",
            &payload.pattern.hydration_rows,
            false,
        )?;
        self.draw_clinical_panel(
            PAGE_PAD_X_MM + left_w + 3.0,
            y,
            right_w,
            h,
            &payload.pattern.clinical_notes,
        )?;
        self.y_mm = y + h + 3.0;
        Ok(())
    }

    fn draw_context_overview(&mut self, payload: &NativeReportPdfPayload) -> Result<(), String> {
        self.start_report_page("Tummy Context", None);
        self.draw_report_meta(payload, true, None);
        self.draw_care_notes(&payload.context.care_notes)?;

        let gap = 3.0;
        let col_w = (CONTENT_WIDTH_MM - gap) / 2.0;
        let left_h = self.measure_info_panel(
            "Poop & Tummy Summary",
            &payload.context.poop_summary_rows,
            col_w,
        );
        let right_h = self.measure_info_panel("Diaper Output", &payload.context.diaper_rows, col_w);
        let h = left_h.max(right_h).max(68.0);
        self.ensure_space(h);
        let y = self.y_mm;
        self.draw_info_panel(
            PAGE_PAD_X_MM,
            y,
            col_w,
            h,
            "Poop & Tummy Summary",
            "poop",
            &payload.context.poop_summary_rows,
            false,
        )?;
        self.draw_info_panel(
            PAGE_PAD_X_MM + col_w + gap,
            y,
            col_w,
            h,
            "Diaper Output",
            "diaper",
            &payload.context.diaper_rows,
            false,
        )?;
        self.y_mm = y + h + 4.0;

        self.draw_episode_context(&payload.context.episode_rows)?;
        Ok(())
    }

    fn draw_context_detail(&mut self, payload: &NativeReportPdfPayload) -> Result<(), String> {
        self.start_report_page(
            "Tummy Context",
            Some("Symptoms, feeding context, and tracking summary for clinical review."),
        );
        let gap = 3.0;
        let col_w = (CONTENT_WIDTH_MM - gap) / 2.0;
        let symptom_h = self.measure_symptom_panel(&payload.context.symptom_rows, col_w);
        let feeding_h = self.measure_feeding_panel(&payload.context.feeding_rows, col_w);
        let h = symptom_h.max(feeding_h).max(94.0);
        self.ensure_space(h);
        let y = self.y_mm + 1.0;
        self.draw_symptom_panel(PAGE_PAD_X_MM, y, col_w, h, &payload.context.symptom_rows)?;
        self.draw_feeding_panel(
            PAGE_PAD_X_MM + col_w + gap,
            y,
            col_w,
            h,
            &payload.context.feeding_rows,
        )?;
        self.y_mm = y + h + 5.0;
        self.draw_tracking_note();
        Ok(())
    }

    fn draw_timeline_pages(&mut self, payload: &NativeReportPdfPayload) -> Result<(), String> {
        self.start_report_page(
            "Clinical Timeline Appendix",
            Some("Chronological log of key events, symptoms, diapers, and feeding for clinical review."),
        );
        self.draw_report_meta(
            payload,
            true,
            Some("Dated events may be more useful than averages when logging is sparse."),
        );
        self.draw_timeline_tabs();
        self.draw_timeline_table_header(self.y_mm);
        self.y_mm += 10.0;

        if payload.timeline_groups.is_empty() {
            self.draw_empty_box(
                "No timeline events match this filter.",
                PAGE_PAD_X_MM,
                self.y_mm,
                CONTENT_WIDTH_MM,
                30.0,
            );
            self.y_mm += 33.0;
            return Ok(());
        }

        for group in &payload.timeline_groups {
            self.draw_timeline_group(group)?;
        }

        Ok(())
    }

    fn draw_brief_hero(&mut self, summary: &str) -> Result<(), String> {
        let text_h = measure_wrapped_text(summary, 136.0, 13.0, None);
        let h = (text_h + 18.0).max(35.0);
        self.ensure_space(h);
        let y = self.y_mm;
        self.draw_round_rect(
            PAGE_PAD_X_MM,
            y,
            CONTENT_WIDTH_MM,
            h,
            CARD_RADIUS_MM,
            wash_soft(),
            Some(rgb(0.92, 0.86, 0.80)),
            0.45,
        );
        self.draw_rect(PAGE_PAD_X_MM, y, 2.0, h, rust(), None, 0.0);
        self.draw_badge(PAGE_PAD_X_MM + 9.0, y + 8.0, 23.0, "B", "alert");
        self.draw_text_line(
            "Pediatrician Brief",
            PAGE_PAD_X_MM + 36.0,
            y + 12.0,
            23.0,
            BuiltinFont::HelveticaBold,
            rust(),
        );
        self.draw_wrapped_text_at(
            summary,
            PAGE_PAD_X_MM + 36.0,
            y + 17.0,
            138.0,
            13.0,
            BuiltinFont::Helvetica,
            ink(),
            None,
        );
        self.y_mm = y + h + 4.6;
        Ok(())
    }

    fn draw_concern_grid(&mut self, concerns: &[BriefRow]) -> Result<(), String> {
        if concerns.is_empty() {
            return Ok(());
        }
        let gap = 3.0;
        let card_w = (CONTENT_WIDTH_MM - gap * 3.0) / 4.0;
        let h = 38.5;
        self.ensure_space(h);
        let y = self.y_mm;
        for (index, concern) in concerns.iter().take(4).enumerate() {
            let x = PAGE_PAD_X_MM + index as f32 * (card_w + gap);
            self.draw_round_rect(
                x,
                y,
                card_w,
                h,
                CARD_RADIUS_MM,
                paper(),
                Some(tone_border(&concern.tone)),
                0.45,
            );
            self.draw_badge(
                x + 3.0,
                y + 3.0,
                9.5,
                label_icon(&concern.label),
                &concern.tone,
            );
            self.draw_wrapped_text_at(
                &concern.label,
                x + 14.0,
                y + 3.0,
                card_w - 17.0,
                10.5,
                BuiltinFont::HelveticaBold,
                tone_main(&concern.tone),
                Some(2),
            );
            self.draw_wrapped_text_at(
                &concern.value,
                x + 3.0,
                y + 15.0,
                card_w - 6.0,
                8.3,
                BuiltinFont::HelveticaBold,
                ink(),
                Some(2),
            );
            self.draw_wrapped_text_at(
                &concern.detail,
                x + 3.0,
                y + 23.0,
                card_w - 6.0,
                7.2,
                BuiltinFont::Helvetica,
                body(),
                Some(4),
            );
        }
        self.y_mm = y + h + 4.0;
        Ok(())
    }

    fn draw_section_title(&mut self, title: &str, icon: Option<&str>, tone: &str) {
        self.ensure_space(11.0);
        let y = self.y_mm;
        let text_x = if let Some(icon) = icon {
            self.draw_badge(PAGE_PAD_X_MM, y, 8.8, icon, tone);
            PAGE_PAD_X_MM + 12.0
        } else {
            PAGE_PAD_X_MM
        };
        self.draw_text_line(
            title,
            text_x,
            y + 6.6,
            15.8,
            BuiltinFont::HelveticaBold,
            leaf(),
        );
        self.draw_heading_rule_after(
            text_x,
            y + 5.4,
            title,
            15.8,
            PAGE_WIDTH_MM - PAGE_PAD_X_MM,
            6.0,
        );
        self.y_mm = y + 11.0;
    }

    fn draw_heading_rule_after(
        &mut self,
        text_x: f32,
        y: f32,
        title: &str,
        font_size_pt: f32,
        max_x: f32,
        gap: f32,
    ) {
        let rule_x = text_x + text_width_estimate(title, font_size_pt) + gap;
        if rule_x + 10.0 <= max_x {
            self.draw_line(rule_x, y, max_x, y, rule(), 0.3);
        }
    }

    fn draw_metric_grid(
        &mut self,
        metrics: &[Metric],
        columns: usize,
        h: f32,
    ) -> Result<(), String> {
        if metrics.is_empty() {
            return Ok(());
        }
        let h = h.max(30.0);
        let gap = 3.0;
        let card_w = (CONTENT_WIDTH_MM - gap * (columns.saturating_sub(1) as f32)) / columns as f32;
        self.ensure_space(h);
        let y = self.y_mm;
        for (index, metric) in metrics.iter().take(columns).enumerate() {
            let x = PAGE_PAD_X_MM + index as f32 * (card_w + gap);
            self.draw_round_rect(
                x,
                y,
                card_w,
                h,
                CARD_RADIUS_MM,
                paper(),
                Some(tone_border(&metric.tone)),
                0.42,
            );
            self.draw_badge(
                x + (card_w - 8.5) / 2.0,
                y + 2.8,
                8.5,
                label_icon(&metric.label),
                &metric.tone,
            );
            let value_font = metric_value_font_size(&metric.value, card_w - 4.0);
            let label_top = y + h - 8.4;
            self.draw_wrapped_text_at(
                &metric.value,
                x + 2.0,
                y + 11.9,
                card_w - 4.0,
                value_font,
                BuiltinFont::HelveticaBold,
                tone_main(&metric.tone),
                Some(if value_font < 11.0 { 2 } else { 1 }),
            );
            self.draw_wrapped_text_at(
                &metric.label,
                x + 2.0,
                label_top,
                card_w - 4.0,
                7.2,
                BuiltinFont::HelveticaBold,
                body(),
                Some(2),
            );
        }
        self.y_mm = y + h;
        Ok(())
    }

    fn measure_event_panel(&self, events: &[ReportEvent], width: f32) -> f32 {
        18.0 + events
            .iter()
            .map(|event| measure_event_row_height(event, width))
            .sum::<f32>()
            + 2.0
    }

    fn draw_event_panel(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        events: &[ReportEvent],
    ) -> Result<(), String> {
        self.draw_round_rect(x, y, w, h, CARD_RADIUS_MM, paper(), Some(rule_soft()), 0.45);
        self.draw_panel_title(
            x + 3.5,
            y + 3.5,
            w - 7.0,
            "Last Important Events",
            "D",
            "default",
        );
        let mut row_y = y + 16.5;
        for event in events {
            let row_h = measure_event_row_height(event, w);
            let detail_x = x + 47.0;
            let detail_w = w - 51.0;
            self.draw_badge(
                x + 3.5,
                row_y + (row_h - 7.2) / 2.0,
                7.2,
                label_icon(&event.label),
                &event.tone,
            );
            self.draw_wrapped_text_at(
                &event.label,
                x + 13.0,
                row_y + 2.0,
                29.0,
                7.8,
                BuiltinFont::HelveticaBold,
                ink(),
                Some(2),
            );
            self.draw_wrapped_text_at(
                &event.value,
                detail_x,
                row_y + 1.9,
                detail_w,
                7.2,
                BuiltinFont::HelveticaBold,
                ink(),
                Some(3),
            );
            let value_h = measure_wrapped_text(&event.value, detail_w, 7.2, Some(3));
            self.draw_wrapped_text_at(
                &event.detail,
                detail_x,
                row_y + 2.6 + value_h,
                detail_w,
                6.3,
                BuiltinFont::Helvetica,
                muted(),
                Some(3),
            );
            self.draw_line(
                x + 3.5,
                row_y + row_h,
                x + w - 3.5,
                row_y + row_h,
                rule_soft(),
                0.25,
            );
            row_y += row_h;
        }
        Ok(())
    }

    fn measure_question_panel(&self, questions: &[String], width: f32) -> f32 {
        16.0 + questions
            .iter()
            .map(|question| measure_wrapped_text(question, width - 16.0, 7.8, None) + 2.4)
            .sum::<f32>()
    }

    fn draw_question_panel(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        questions: &[String],
    ) -> Result<(), String> {
        self.draw_round_rect(x, y, w, h, CARD_RADIUS_MM, paper(), Some(rule_soft()), 0.45);
        self.draw_panel_title(
            x + 3.5,
            y + 3.5,
            w - 7.0,
            "Questions to Ask the Doctor",
            "Q",
            "default",
        );
        let mut cursor_y = y + 16.5;
        for question in questions {
            self.draw_circle(x + 6.0, cursor_y + 2.3, 0.9, leaf(), None, 0.0);
            let used = self.draw_wrapped_text_at(
                question,
                x + 10.0,
                cursor_y,
                w - 14.0,
                7.8,
                BuiltinFont::Helvetica,
                ink(),
                None,
            );
            cursor_y += used + 2.2;
        }
        Ok(())
    }

    fn draw_chart_title(&mut self, x: f32, y: f32, w: f32, title: &str, icon: &str) {
        self.draw_badge(x, y, 8.2, icon, "alert");
        self.draw_text_line(
            title,
            x + 10.8,
            y + 6.0,
            13.5,
            BuiltinFont::HelveticaBold,
            rust(),
        );
        self.draw_heading_rule_after(x + 10.8, y + 5.0, title, 13.5, x + w, 5.0);
    }

    fn draw_daily_stool_chart(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        points: &[DailyPoint],
        no_poop_dates: &[String],
    ) -> Result<(), String> {
        self.draw_round_rect(x, y, w, h, CARD_RADIUS_MM, paper(), Some(rule_soft()), 0.45);
        self.draw_chart_title(x + 4.0, y + 3.6, w - 8.0, "Daily Stool Output", "poop");
        self.draw_text_line(
            "Stool count by recent day",
            x + 15.0,
            y + 14.0,
            7.5,
            BuiltinFont::Helvetica,
            body(),
        );
        self.draw_bar_axis(
            x + 5.0,
            y + 22.0,
            35.0,
            chart_scale_max(points.iter().map(|p| p.stool_count).collect()),
        );
        self.draw_stool_bars(x + 14.0, y + 21.5, w - 18.0, 45.0, points)?;
        let note = if no_poop_dates.is_empty() {
            "No-poop days: none marked".to_string()
        } else {
            format!("No-poop days: {}", no_poop_dates.join(", "))
        };
        self.draw_round_rect(
            x + 4.0,
            y + h - 10.0,
            w - 8.0,
            7.0,
            1.8,
            wash(),
            Some(rule_soft()),
            0.3,
        );
        self.draw_wrapped_text_at(
            &note,
            x + 7.0,
            y + h - 8.8,
            w - 14.0,
            6.8,
            BuiltinFont::Helvetica,
            body(),
            Some(2),
        );
        Ok(())
    }

    fn draw_daily_diaper_chart(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        points: &[DailyPoint],
    ) -> Result<(), String> {
        self.draw_round_rect(x, y, w, h, CARD_RADIUS_MM, paper(), Some(rule_soft()), 0.45);
        self.draw_chart_title(x + 4.0, y + 3.6, w - 8.0, "Daily Diaper Output", "diaper");
        self.draw_text_line(
            "Wet, dirty, and mixed diapers by recent day",
            x + 15.0,
            y + 14.0,
            7.2,
            BuiltinFont::Helvetica,
            body(),
        );
        self.draw_legend(
            x + 15.0,
            y + 18.7,
            &[("Wet", leaf()), ("Dirty", rust()), ("Mixed", gold_soft())],
        );
        let max = chart_scale_max(
            points
                .iter()
                .map(|p| p.wet_only + p.dirty_only + p.mixed)
                .collect(),
        );
        self.draw_bar_axis(x + 5.0, y + 27.0, 32.0, max);
        self.draw_diaper_bars(x + 14.0, y + 26.5, w - 18.0, 41.0, points, max)?;
        Ok(())
    }

    fn draw_stool_type_trend(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        points: &[TypeTrendPoint],
    ) -> Result<(), String> {
        self.draw_round_rect(x, y, w, h, CARD_RADIUS_MM, paper(), Some(rule_soft()), 0.45);
        self.draw_chart_title(x + 4.0, y + 3.6, w - 8.0, "Stool Type Trend", "poop");
        self.draw_text_line(
            "Bristol-style stool types over time",
            x + 15.0,
            y + 14.0,
            7.5,
            BuiltinFont::Helvetica,
            body(),
        );

        if points.is_empty() {
            self.draw_empty_box(
                "No stool type values were recorded in this period.",
                x + 5.0,
                y + 24.0,
                w - 10.0,
                31.0,
            );
            return Ok(());
        }

        let count = points.len().max(1);
        let slot = (w - 12.0) / count as f32;
        for (index, point) in points.iter().enumerate() {
            let cx = x + 6.0 + slot * index as f32 + slot / 2.0;
            self.draw_circle(
                cx,
                y + 28.0,
                5.0,
                paper(),
                Some(tone_main(&point.tone)),
                0.65,
            );
            self.draw_text_line(
                &point.label,
                cx - 3.0,
                y + 29.5,
                7.4,
                BuiltinFont::HelveticaBold,
                tone_main(&point.tone),
            );
            self.draw_wrapped_text_at(
                &point.date_label,
                cx - slot / 2.0 + 1.0,
                y + 34.8,
                slot - 2.0,
                6.2,
                BuiltinFont::Helvetica,
                body(),
                Some(2),
            );
        }

        self.draw_round_rect(
            x + 6.0,
            y + 45.0,
            w - 12.0,
            h - 50.0,
            2.0,
            wash_soft(),
            Some(rule_soft()),
            0.3,
        );
        self.draw_text_line(
            "Bristol Stool Chart (Simplified)",
            x + 22.0,
            y + 50.0,
            7.5,
            BuiltinFont::HelveticaBold,
            ink(),
        );
        let labels = [
            ("T1", "Separate hard lumps"),
            ("T2", "Lumpy"),
            ("T3", "Cracked / firm"),
            ("T4", "Smooth & soft"),
            ("T5", "Soft blobs"),
            ("T6", "Mushy / liquid"),
        ];
        for (index, (code, label)) in labels.iter().enumerate() {
            let col = index % 2;
            let row = index / 2;
            let item_x = x + 10.0 + col as f32 * ((w - 20.0) / 2.0);
            let item_y = y + 55.0 + row as f32 * 5.3;
            self.draw_circle(
                item_x + 2.7,
                item_y + 2.0,
                2.1,
                rust_soft(),
                Some(rust()),
                0.3,
            );
            self.draw_text_line(
                code,
                item_x + 6.2,
                item_y + 3.0,
                6.2,
                BuiltinFont::HelveticaBold,
                ink(),
            );
            self.draw_wrapped_text_at(
                label,
                item_x + 13.0,
                item_y,
                (w - 24.0) / 2.0 - 13.0,
                5.8,
                BuiltinFont::Helvetica,
                body(),
                Some(2),
            );
        }
        Ok(())
    }

    fn draw_colour_breakdown(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        items: &[ColourBreakdownItem],
    ) -> Result<(), String> {
        self.draw_round_rect(x, y, w, h, CARD_RADIUS_MM, paper(), Some(rule_soft()), 0.45);
        self.draw_chart_title(x + 4.0, y + 3.6, w - 8.0, "Stool Colour Breakdown", "poop");
        self.draw_text_line(
            "Colours observed in this period",
            x + 15.0,
            y + 14.0,
            7.5,
            BuiltinFont::Helvetica,
            body(),
        );

        if items.is_empty() {
            self.draw_empty_box(
                "No stool colours were recorded in this period.",
                x + 5.0,
                y + 25.0,
                w - 10.0,
                31.0,
            );
            return Ok(());
        }

        let cx = x + 23.5;
        let cy = y + 42.0;
        self.draw_donut(cx, cy, 18.0, 10.0, items);
        self.draw_text_line(
            &format!("{}%", items[0].percent),
            cx - 4.0,
            cy + 1.5,
            8.2,
            BuiltinFont::HelveticaBold,
            ink(),
        );

        let list_x = x + 48.5;
        let mut row_y = y + 25.5;
        for item in items.iter().take(6) {
            let value = format!("{}% ({})", item.percent, item.count);
            let value_font = 6.8;
            let value_right = x + w - 4.0;
            let value_left = value_right - text_width_estimate(&value, value_font);
            let label_x = list_x + 6.0;
            let label_w = (value_left - label_x - 2.0).max(18.0);
            let note = if item.is_red_flag {
                "Red-flag colour"
            } else if item.value == items[0].value {
                "Most common"
            } else {
                "Observed"
            };
            let label_h = measure_wrapped_text(&item.label, label_w, 7.1, Some(2));
            let note_h = measure_wrapped_text(note, label_w, 5.8, Some(1));
            let row_h = 8.6_f32.max(label_h + note_h + 0.8);
            self.draw_circle(
                list_x + 2.0,
                row_y + 2.0,
                1.8,
                color_from_hex(&item.color, muted()),
                Some(rgb(0.28, 0.22, 0.18)),
                0.2,
            );
            self.draw_wrapped_text_at(
                &item.label,
                label_x,
                row_y - 0.8,
                label_w,
                7.1,
                BuiltinFont::HelveticaBold,
                if item.is_red_flag { rust() } else { ink() },
                Some(2),
            );
            self.draw_wrapped_text_at(
                note,
                label_x,
                row_y - 0.4 + label_h,
                label_w,
                5.8,
                BuiltinFont::Helvetica,
                muted(),
                Some(1),
            );
            self.draw_text_line(
                &value,
                value_right - text_width_estimate(&value, value_font),
                row_y + 2.8,
                value_font,
                BuiltinFont::HelveticaBold,
                ink(),
            );
            row_y += row_h;
        }
        Ok(())
    }

    fn measure_info_panel(&self, title: &str, rows: &[InfoRow], width: f32) -> f32 {
        16.0 + measure_wrapped_text(title, width - 22.0, 12.0, Some(1))
            + rows
                .iter()
                .map(|row| measure_info_row_height(row, width, false))
                .sum::<f32>()
            + 2.0
    }

    fn draw_info_panel(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        title: &str,
        icon: &str,
        rows: &[InfoRow],
        compact: bool,
    ) -> Result<(), String> {
        self.draw_round_rect(x, y, w, h, CARD_RADIUS_MM, paper(), Some(rule_soft()), 0.45);
        self.draw_panel_title(
            x + 3.5,
            y + 3.2,
            w - 7.0,
            title,
            icon,
            if title.contains("Hydration") {
                "info"
            } else {
                "default"
            },
        );
        let mut row_y = y + if compact { 13.0 } else { 15.0 };
        for row in rows {
            let tone = row.tone.as_deref().unwrap_or("default");
            let row_h = measure_info_row_height(row, w, compact);
            let label_w = if compact { w * 0.34 } else { w * 0.36 };
            let value_x = x + if compact { w * 0.48 } else { w * 0.52 };
            let value_w = x + w - value_x - 3.5;
            let value_font = if compact { 8.0 } else { 9.4 };
            self.draw_badge(
                x + 3.5,
                row_y + (row_h - if compact { 6.0 } else { 7.0 }) / 2.0,
                if compact { 6.0 } else { 7.0 },
                label_icon(&row.label),
                tone,
            );
            self.draw_wrapped_text_at(
                &row.label,
                x + 12.0,
                row_y + 1.5,
                label_w,
                7.0,
                BuiltinFont::HelveticaBold,
                ink(),
                Some(3),
            );
            let value_h = self.draw_wrapped_text_at(
                &row.value,
                value_x,
                row_y + 1.2,
                value_w,
                value_font,
                BuiltinFont::HelveticaBold,
                tone_main(tone),
                Some(3),
            );
            if let Some(detail) = &row.detail {
                self.draw_wrapped_text_at(
                    detail,
                    value_x,
                    row_y + 2.0 + value_h,
                    value_w,
                    if compact { 5.6 } else { 5.8 },
                    BuiltinFont::Helvetica,
                    body(),
                    Some(3),
                );
            }
            self.draw_line(
                x + 3.5,
                row_y + row_h,
                x + w - 3.5,
                row_y + row_h,
                rule_soft(),
                0.25,
            );
            row_y += row_h;
        }
        Ok(())
    }

    fn measure_clinical_panel(&self, rows: &[ClinicalNote], width: f32) -> f32 {
        17.0 + rows
            .iter()
            .map(|row| measure_clinical_row_height(row, width))
            .sum::<f32>()
            + 2.0
    }

    fn draw_clinical_panel(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        rows: &[ClinicalNote],
    ) -> Result<(), String> {
        self.draw_round_rect(x, y, w, h, CARD_RADIUS_MM, paper(), Some(rule_soft()), 0.45);
        self.draw_panel_title(
            x + 3.5,
            y + 3.2,
            w - 7.0,
            "At-a-Glance Clinical Notes",
            "N",
            "alert",
        );
        let mut row_y = y + 15.0;
        for (index, row) in rows.iter().enumerate() {
            let row_h = measure_clinical_row_height(row, w);
            let fill = if index % 2 == 0 { paper() } else { wash() };
            self.draw_rect(x + 3.2, row_y, w - 6.4, row_h, fill, None, 0.0);
            self.draw_badge(
                x + 5.0,
                row_y + (row_h - 5.8) / 2.0,
                5.8,
                label_icon(&row.topic),
                &row.tone,
            );
            self.draw_wrapped_text_at(
                &row.topic,
                x + 13.0,
                row_y + 2.0,
                27.0,
                6.8,
                BuiltinFont::HelveticaBold,
                ink(),
                Some(2),
            );
            self.draw_wrapped_text_at(
                &row.note,
                x + 43.0,
                row_y + 2.0,
                w - 48.0,
                6.8,
                BuiltinFont::Helvetica,
                body(),
                None,
            );
            self.draw_line(
                x + 3.2,
                row_y + row_h,
                x + w - 3.2,
                row_y + row_h,
                rule_soft(),
                0.25,
            );
            row_y += row_h;
        }
        Ok(())
    }

    fn draw_care_notes(&mut self, rows: &[InfoRow]) -> Result<(), String> {
        let cols = 2;
        let gap = 2.5;
        let row_h = 12.0;
        let rows_count = ((rows.len().max(1) + cols - 1) / cols) as f32;
        let h = 8.0 + rows_count * row_h + 4.0;
        self.ensure_space(h);
        let y = self.y_mm;
        self.draw_round_rect(
            PAGE_PAD_X_MM,
            y,
            CONTENT_WIDTH_MM,
            h,
            CARD_RADIUS_MM,
            wash_soft(),
            Some(rule_soft()),
            0.45,
        );
        self.draw_rect(PAGE_PAD_X_MM, y, 2.0, h, rust(), None, 0.0);
        let item_w = (CONTENT_WIDTH_MM - 11.0 - gap) / cols as f32;
        for (index, row) in rows.iter().enumerate() {
            let col = index % cols;
            let row_index = index / cols;
            let x = PAGE_PAD_X_MM + 6.0 + col as f32 * (item_w + gap);
            let item_y = y + 4.0 + row_index as f32 * row_h;
            self.draw_round_rect(
                x,
                item_y,
                item_w,
                row_h - 1.0,
                1.7,
                rgba_paper(),
                Some(rule_soft()),
                0.25,
            );
            let tone = row.tone.as_deref().unwrap_or("default");
            self.draw_badge(x + 1.8, item_y + 2.0, 6.6, label_icon(&row.label), tone);
            self.draw_wrapped_text_at(
                &row.value,
                x + 10.0,
                item_y + 1.5,
                item_w - 12.0,
                6.7,
                BuiltinFont::HelveticaBold,
                ink(),
                Some(2),
            );
            if let Some(detail) = &row.detail {
                self.draw_wrapped_text_at(
                    detail,
                    x + 10.0,
                    item_y + 6.2,
                    item_w - 12.0,
                    5.6,
                    BuiltinFont::Helvetica,
                    muted(),
                    Some(2),
                );
            }
        }
        self.y_mm = y + h + 3.0;
        Ok(())
    }

    fn draw_episode_context(&mut self, rows: &[InfoRow]) -> Result<(), String> {
        let left_w = 26.0;
        let gap = 3.0;
        let item_w = (CONTENT_WIDTH_MM - left_w - gap - 3.0) / 2.0;
        let mut row_heights = Vec::new();
        for chunk in rows.chunks(2) {
            row_heights.push(
                chunk
                    .iter()
                    .map(|row| measure_episode_item_height(row, item_w))
                    .fold(0.0_f32, f32::max),
            );
        }
        if row_heights.is_empty() {
            row_heights.push(13.5);
        }
        let grid_h =
            row_heights.iter().sum::<f32>() + (row_heights.len().saturating_sub(1) as f32 * 2.0);
        let h = 35.0_f32.max(grid_h + 12.0);
        self.ensure_space(h);
        let y = self.y_mm;
        self.draw_round_rect(
            PAGE_PAD_X_MM,
            y,
            CONTENT_WIDTH_MM,
            h,
            CARD_RADIUS_MM,
            rgb(1.0, 0.972, 0.953),
            Some(rgb(0.94, 0.79, 0.73)),
            0.45,
        );
        let cols = 2;
        self.draw_badge(PAGE_PAD_X_MM + 5.5, y + 7.5, 14.0, "episode", "alert");
        self.draw_wrapped_text_at(
            "Episode Context",
            PAGE_PAD_X_MM + 4.8,
            y + 23.0,
            left_w - 4.0,
            11.8,
            BuiltinFont::HelveticaBold,
            rust(),
            Some(2),
        );
        let grid_x = PAGE_PAD_X_MM + left_w + gap;
        let mut row_offsets = Vec::new();
        let mut offset = 6.0;
        for row_h in &row_heights {
            row_offsets.push(offset);
            offset += *row_h + 2.0;
        }
        for (index, row) in rows.iter().enumerate() {
            let col = index % cols;
            let row_index = index / cols;
            let x = grid_x + col as f32 * (item_w + 2.0);
            let item_y = y + row_offsets[row_index];
            let item_h = row_heights[row_index];
            let tone = row.tone.as_deref().unwrap_or("default");
            self.draw_round_rect(
                x,
                item_y,
                item_w,
                item_h,
                1.6,
                paper(),
                Some(rule_soft()),
                0.25,
            );
            self.draw_badge(
                x + 1.6,
                item_y + (item_h - 6.0) / 2.0,
                6.0,
                label_icon(&row.label),
                tone,
            );
            self.draw_text_line(
                &row.label,
                x + 8.8,
                item_y + 4.5,
                5.8,
                BuiltinFont::Helvetica,
                body(),
            );
            let value_h = self.draw_wrapped_text_at(
                &row.value,
                x + 8.8,
                item_y + 5.0,
                item_w - 10.5,
                6.4,
                BuiltinFont::HelveticaBold,
                ink(),
                Some(2),
            );
            if let Some(detail) = &row.detail {
                self.draw_wrapped_text_at(
                    detail,
                    x + 8.8,
                    item_y + 5.8 + value_h,
                    item_w - 10.5,
                    5.3,
                    BuiltinFont::Helvetica,
                    body(),
                    Some(2),
                );
            }
        }
        self.y_mm = y + h + 3.0;
        Ok(())
    }

    fn measure_symptom_panel(&self, rows: &[SymptomSummaryRow], width: f32) -> f32 {
        if rows.is_empty() {
            return 48.0;
        }
        24.0 + rows
            .iter()
            .map(|row| measure_symptom_row_height(row, width))
            .sum::<f32>()
            + 2.0
    }

    fn draw_symptom_panel(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        rows: &[SymptomSummaryRow],
    ) -> Result<(), String> {
        self.draw_round_rect(x, y, w, h, CARD_RADIUS_MM, paper(), Some(rule_soft()), 0.45);
        self.draw_panel_title(x + 3.5, y + 3.2, w - 7.0, "Symptoms", "symptom", "alert");
        if rows.is_empty() {
            self.draw_empty_box(
                "No symptoms were logged in this period.",
                x + 5.0,
                y + 18.0,
                w - 10.0,
                25.0,
            );
            return Ok(());
        }
        let mut row_y = y + 17.0;
        let widths = symptom_table_widths(w);
        self.draw_table_header(
            x + 3.0,
            row_y,
            w - 6.0,
            &["Symptom", "Severity", "Latest", "Parent note"],
            &widths,
        );
        row_y += 7.0;
        for row in rows {
            let row_h = measure_symptom_row_height(row, w);
            self.draw_rect(
                x + 3.0,
                row_y,
                w - 6.0,
                row_h,
                paper(),
                Some(rule_soft()),
                0.2,
            );
            let inner_x = x + 3.0;
            self.draw_badge(
                inner_x + 1.5,
                row_y + (row_h - 5.2) / 2.0,
                5.2,
                label_icon(&row.symptom),
                &row.tone,
            );
            self.draw_wrapped_text_at(
                &row.symptom,
                inner_x + 8.0,
                row_y + 2.0,
                widths[0] - 9.0,
                6.2,
                BuiltinFont::HelveticaBold,
                ink(),
                None,
            );
            self.draw_severity_dots(
                inner_x + widths[0] + 2.2,
                row_y + row_h / 2.0,
                row.severity_score,
            );
            self.draw_wrapped_text_at(
                &row.latest,
                inner_x + widths[0] + widths[1] + 2.0,
                row_y + 2.0,
                widths[2] - 3.0,
                5.8,
                BuiltinFont::Helvetica,
                body(),
                None,
            );
            self.draw_wrapped_text_at(
                &row.note,
                inner_x + widths[0] + widths[1] + widths[2] + 2.0,
                row_y + 2.0,
                widths[3] - 3.0,
                6.0,
                BuiltinFont::Helvetica,
                body(),
                None,
            );
            row_y += row_h;
        }
        Ok(())
    }

    fn measure_feeding_panel(&self, rows: &[FeedingSummaryRow], width: f32) -> f32 {
        if rows.is_empty() {
            return 48.0;
        }
        24.0 + rows
            .iter()
            .map(|row| measure_feeding_row_height(row, width))
            .sum::<f32>()
            + 2.0
    }

    fn draw_feeding_panel(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        rows: &[FeedingSummaryRow],
    ) -> Result<(), String> {
        self.draw_round_rect(x, y, w, h, CARD_RADIUS_MM, paper(), Some(rule_soft()), 0.45);
        self.draw_panel_title(
            x + 3.5,
            y + 3.2,
            w - 7.0,
            "Feeding Summary",
            "feed",
            "default",
        );
        if rows.is_empty() {
            self.draw_empty_box(
                "No feeding logs were included in this report.",
                x + 5.0,
                y + 18.0,
                w - 10.0,
                25.0,
            );
            return Ok(());
        }
        let mut row_y = y + 17.0;
        let widths = feeding_table_widths(w);
        self.draw_table_header(
            x + 3.0,
            row_y,
            w - 6.0,
            &["Type", "Entries", "Notes"],
            &widths,
        );
        row_y += 7.0;
        for row in rows {
            let row_h = measure_feeding_row_height(row, w);
            self.draw_rect(
                x + 3.0,
                row_y,
                w - 6.0,
                row_h,
                paper(),
                Some(rule_soft()),
                0.2,
            );
            let inner_x = x + 3.0;
            self.draw_badge(
                inner_x + 1.5,
                row_y + (row_h - 5.2) / 2.0,
                5.2,
                label_icon(&row.r#type),
                "default",
            );
            self.draw_wrapped_text_at(
                &row.r#type,
                inner_x + 8.0,
                row_y + 2.0,
                widths[0] - 9.0,
                6.4,
                BuiltinFont::HelveticaBold,
                ink(),
                None,
            );
            self.draw_wrapped_text_at(
                &row.entries,
                inner_x + widths[0] + 2.0,
                row_y + 2.0,
                widths[1] - 3.0,
                6.2,
                BuiltinFont::Helvetica,
                body(),
                None,
            );
            self.draw_wrapped_text_at(
                &row.notes,
                inner_x + widths[0] + widths[1] + 2.0,
                row_y + 2.0,
                widths[2] - 3.0,
                6.2,
                BuiltinFont::Helvetica,
                body(),
                None,
            );
            row_y += row_h;
        }
        Ok(())
    }

    fn draw_tracking_note(&mut self) {
        let h = 12.0;
        self.ensure_space(h);
        let y = self.y_mm;
        self.draw_round_rect(
            PAGE_PAD_X_MM,
            y,
            CONTENT_WIDTH_MM,
            h,
            CARD_RADIUS_MM,
            rgb(1.0, 0.957, 0.894),
            Some(rule_soft()),
            0.35,
        );
        self.draw_text_line(
            "Tracking summary only.",
            PAGE_PAD_X_MM + 5.0,
            y + 7.2,
            8.0,
            BuiltinFont::HelveticaBold,
            ink(),
        );
        self.draw_text_line(
            "These insights reflect logged observations. They are not medical advice.",
            PAGE_PAD_X_MM + 40.0,
            y + 7.2,
            8.0,
            BuiltinFont::Helvetica,
            body(),
        );
        self.y_mm += h + 3.0;
    }

    fn draw_timeline_tabs(&mut self) {
        let y = self.y_mm;
        let labels = [
            ("Full timeline", "T", true),
            ("Poop / diaper", "poop", false),
            ("Symptoms / episodes", "symptom", false),
            ("Doctor brief", "B", false),
        ];
        let gap = 7.0;
        let tab_w = (CONTENT_WIDTH_MM - gap * 3.0) / 4.0;
        for (index, (label, icon, active)) in labels.iter().enumerate() {
            let x = PAGE_PAD_X_MM + index as f32 * (tab_w + gap);
            let tone = if *active { "alert" } else { "default" };
            self.draw_round_rect(
                x,
                y,
                tab_w,
                12.5,
                CARD_RADIUS_MM,
                if *active {
                    rgb(1.0, 0.972, 0.953)
                } else {
                    paper()
                },
                Some(if *active { rust() } else { rule() }),
                0.35,
            );
            self.draw_badge(x + 4.0, y + 2.7, 5.8, icon, tone);
            self.draw_wrapped_text_at(
                label,
                x + 12.0,
                y + 3.0,
                tab_w - 14.0,
                8.2,
                BuiltinFont::HelveticaBold,
                if *active { rust() } else { leaf() },
                Some(2),
            );
        }
        self.y_mm += 18.0;
    }

    fn draw_timeline_table_header(&mut self, y: f32) {
        let widths = timeline_widths();
        let labels = ["Date / Time", "Event", "Key Details", "Parent Note"];
        self.draw_round_rect(
            PAGE_PAD_X_MM,
            y,
            CONTENT_WIDTH_MM,
            10.0,
            2.0,
            wash(),
            Some(rule_soft()),
            0.3,
        );
        let mut x = PAGE_PAD_X_MM;
        for (index, label) in labels.iter().enumerate() {
            self.draw_text_line(
                label,
                x + 3.0,
                y + 6.5,
                9.0,
                BuiltinFont::HelveticaBold,
                leaf(),
            );
            if index < labels.len() - 1 {
                self.draw_line(
                    x + widths[index],
                    y,
                    x + widths[index],
                    y + 10.0,
                    rule_soft(),
                    0.25,
                );
            }
            x += widths[index];
        }
    }

    fn draw_timeline_group(&mut self, group: &TimelineGroup) -> Result<(), String> {
        let date_h = 8.6;
        if self.y_mm + date_h + 9.0 > CONTENT_BOTTOM_MM {
            self.continue_report_page();
            self.draw_timeline_table_header(self.y_mm);
            self.y_mm += 10.0;
        }
        let y = self.y_mm;
        self.draw_rect(
            PAGE_PAD_X_MM,
            y,
            CONTENT_WIDTH_MM,
            date_h,
            rgb(1.0, 0.981, 0.957),
            Some(rule_soft()),
            0.25,
        );
        self.draw_circle(PAGE_PAD_X_MM + 3.0, y + 4.0, 1.15, rust(), None, 0.0);
        self.draw_text_line(
            &group.date_label,
            PAGE_PAD_X_MM + 8.0,
            y + 5.8,
            10.5,
            BuiltinFont::HelveticaBold,
            rust(),
        );
        self.y_mm += date_h;

        for row in &group.rows {
            self.draw_timeline_row(row)?;
        }
        Ok(())
    }

    fn draw_timeline_row(&mut self, row: &TimelineRow) -> Result<(), String> {
        let widths = timeline_widths();
        let row_h = [
            measure_wrapped_text(&row.time, widths[0] - 6.0, 7.1, None),
            measure_wrapped_text(&row.event, widths[1] - 10.0, 7.2, None),
            measure_wrapped_text(&row.details, widths[2] - 6.0, 7.1, None),
            measure_wrapped_text(&row.note, widths[3] - 6.0, 7.1, None),
        ]
        .into_iter()
        .fold(0.0_f32, f32::max)
            + 5.0;
        let row_h = row_h.max(9.0);

        if self.y_mm + row_h > CONTENT_BOTTOM_MM {
            self.continue_report_page();
            self.draw_timeline_table_header(self.y_mm);
            self.y_mm += 10.0;
        }

        let y = self.y_mm;
        self.draw_rect(
            PAGE_PAD_X_MM,
            y,
            CONTENT_WIDTH_MM,
            row_h,
            paper(),
            Some(rule_soft()),
            0.2,
        );
        let mut x = PAGE_PAD_X_MM;
        self.draw_wrapped_text_at(
            &row.time,
            x + 3.0,
            y + 2.0,
            widths[0] - 6.0,
            7.1,
            BuiltinFont::Helvetica,
            body(),
            None,
        );
        x += widths[0];
        self.draw_line(x, y, x, y + row_h, rule_soft(), 0.22);
        self.draw_badge(
            x + 2.5,
            y + (row_h - 5.2) / 2.0,
            5.2,
            label_icon(&row.event),
            &row.tone,
        );
        self.draw_wrapped_text_at(
            &row.event,
            x + 9.0,
            y + 2.0,
            widths[1] - 11.0,
            7.2,
            BuiltinFont::HelveticaBold,
            ink(),
            None,
        );
        x += widths[1];
        self.draw_line(x, y, x, y + row_h, rule_soft(), 0.22);
        self.draw_wrapped_text_at(
            &row.details,
            x + 3.0,
            y + 2.0,
            widths[2] - 6.0,
            7.1,
            BuiltinFont::Helvetica,
            body(),
            None,
        );
        x += widths[2];
        self.draw_line(x, y, x, y + row_h, rule_soft(), 0.22);
        self.draw_wrapped_text_at(
            &row.note,
            x + 3.0,
            y + 2.0,
            widths[3] - 6.0,
            7.1,
            BuiltinFont::Helvetica,
            body(),
            None,
        );
        self.y_mm += row_h;
        Ok(())
    }

    fn draw_stool_bars(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        points: &[DailyPoint],
    ) -> Result<(), String> {
        let max = chart_scale_max(points.iter().map(|p| p.stool_count).collect()).max(1);
        if points.is_empty() {
            self.draw_empty_box("No daily stool data.", x, y, w, h);
            return Ok(());
        }
        let slot = w / points.len() as f32;
        for (index, point) in points.iter().enumerate() {
            let cx = x + index as f32 * slot;
            self.draw_text_line(
                &point.stool_count.to_string(),
                cx + slot / 2.0 - 1.3,
                y + 3.2,
                6.5,
                BuiltinFont::HelveticaBold,
                ink(),
            );
            self.draw_line(
                cx + slot / 2.0,
                y + 7.0,
                cx + slot / 2.0,
                y + 35.0,
                rgb(0.90, 0.87, 0.81),
                0.2,
            );
            let bar_h = if point.stool_count > 0 {
                ((point.stool_count as f32 / max as f32) * 29.0).max(2.0)
            } else {
                0.0
            };
            if bar_h > 0.0 {
                self.draw_round_rect(
                    cx + slot * 0.32,
                    y + 35.0 - bar_h,
                    slot * 0.36,
                    bar_h,
                    0.7,
                    rust(),
                    Some(rgb(0.55, 0.35, 0.28)),
                    0.2,
                );
            }
            if point.no_poop_count > 0 {
                self.draw_circle(cx + slot / 2.0, y + 12.0, 3.0, paper(), Some(muted()), 0.25);
                self.draw_text_line(
                    "NP",
                    cx + slot / 2.0 - 2.6,
                    y + 13.0,
                    4.2,
                    BuiltinFont::HelveticaBold,
                    muted(),
                );
            }
            self.draw_wrapped_text_at(
                &point.weekday,
                cx,
                y + 37.0,
                slot,
                6.3,
                BuiltinFont::HelveticaBold,
                body(),
                Some(1),
            );
            self.draw_wrapped_text_at(
                &point.date_label,
                cx,
                y + 41.0,
                slot,
                5.6,
                BuiltinFont::Helvetica,
                body(),
                Some(1),
            );
        }
        Ok(())
    }

    fn draw_diaper_bars(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        points: &[DailyPoint],
        max: u32,
    ) -> Result<(), String> {
        if points.is_empty() {
            self.draw_empty_box("No daily diaper data.", x, y, w, h);
            return Ok(());
        }
        let max = max.max(1);
        let slot = w / points.len() as f32;
        for (index, point) in points.iter().enumerate() {
            let total = point.wet_only + point.dirty_only + point.mixed;
            let cx = x + index as f32 * slot;
            self.draw_text_line(
                &total.to_string(),
                cx + slot / 2.0 - 1.3,
                y + 3.2,
                6.5,
                BuiltinFont::HelveticaBold,
                ink(),
            );
            self.draw_line(
                cx + slot / 2.0,
                y + 7.0,
                cx + slot / 2.0,
                y + 32.0,
                rgb(0.90, 0.87, 0.81),
                0.2,
            );
            let bar_h = if total > 0 {
                ((total as f32 / max as f32) * 26.0).max(2.0)
            } else {
                0.0
            };
            if bar_h > 0.0 {
                let bar_x = cx + slot * 0.30;
                let bar_w = slot * 0.40;
                let mut used = 0.0;
                for (value, color) in [
                    (point.wet_only, leaf()),
                    (point.dirty_only, rust()),
                    (point.mixed, gold_soft()),
                ] {
                    if value == 0 {
                        continue;
                    }
                    let seg_h = (value as f32 / total as f32) * bar_h;
                    self.draw_rect(
                        bar_x,
                        y + 32.0 - used - seg_h,
                        bar_w,
                        seg_h,
                        color,
                        Some(rgb(0.30, 0.24, 0.20)),
                        0.15,
                    );
                    used += seg_h;
                }
            }
            self.draw_wrapped_text_at(
                &point.weekday,
                cx,
                y + 34.0,
                slot,
                6.3,
                BuiltinFont::HelveticaBold,
                body(),
                Some(1),
            );
            self.draw_wrapped_text_at(
                &point.date_label,
                cx,
                y + 38.0,
                slot,
                5.6,
                BuiltinFont::Helvetica,
                body(),
                Some(1),
            );
        }
        Ok(())
    }

    fn draw_bar_axis(&mut self, x: f32, y: f32, h: f32, max: u32) {
        self.draw_text_line(
            &max.to_string(),
            x,
            y + 2.5,
            6.4,
            BuiltinFont::Helvetica,
            muted(),
        );
        self.draw_text_line(
            &((max as f32 / 2.0).ceil() as u32).max(1).to_string(),
            x,
            y + h / 2.0 + 2.5,
            6.4,
            BuiltinFont::Helvetica,
            muted(),
        );
        self.draw_text_line(
            "0",
            x + 1.8,
            y + h + 1.0,
            6.4,
            BuiltinFont::Helvetica,
            muted(),
        );
    }

    fn draw_legend(&mut self, x: f32, y: f32, items: &[(&str, Color)]) {
        let mut cursor = x;
        for (label, color) in items {
            self.draw_rect(
                cursor,
                y,
                2.8,
                2.8,
                color.clone(),
                Some(rgb(0.30, 0.24, 0.20)),
                0.15,
            );
            self.draw_text_line(
                label,
                cursor + 4.3,
                y + 2.8,
                6.8,
                BuiltinFont::HelveticaBold,
                body(),
            );
            cursor += 18.0;
        }
    }

    fn draw_donut(
        &mut self,
        cx: f32,
        cy: f32,
        outer_r: f32,
        inner_r: f32,
        items: &[ColourBreakdownItem],
    ) {
        let total: u32 = items.iter().map(|item| item.count).sum();
        if total == 0 {
            self.draw_circle(cx, cy, outer_r, wash(), Some(rule_soft()), 0.25);
            self.draw_circle(cx, cy, inner_r, paper(), None, 0.0);
            return;
        }

        let mut offset = 0.0_f32;
        for (index, item) in items.iter().enumerate() {
            let length = if index == items.len() - 1 {
                (1.0 - offset).max(0.0)
            } else {
                item.count as f32 / total as f32
            };
            self.draw_donut_segment(
                cx,
                cy,
                outer_r,
                inner_r,
                -90.0 + offset * 360.0,
                length * 360.0,
                color_from_hex(&item.color, muted()),
            );
            offset += length;
        }
        self.draw_circle(cx, cy, inner_r, paper(), Some(rule_soft()), 0.2);
    }

    fn draw_donut_segment(
        &mut self,
        cx: f32,
        cy: f32,
        outer_r: f32,
        inner_r: f32,
        start_deg: f32,
        sweep_deg: f32,
        color: Color,
    ) {
        let steps = ((sweep_deg.abs() / 8.0).ceil() as usize).max(3);
        let mut points = Vec::new();
        for index in 0..=steps {
            let angle = (start_deg + sweep_deg * (index as f32 / steps as f32)).to_radians();
            points.push((cx + angle.cos() * outer_r, cy + angle.sin() * outer_r));
        }
        for index in (0..=steps).rev() {
            let angle = (start_deg + sweep_deg * (index as f32 / steps as f32)).to_radians();
            points.push((cx + angle.cos() * inner_r, cy + angle.sin() * inner_r));
        }
        self.draw_polygon_from_top(&points, color, None, 0.0);
    }

    fn draw_panel_title(&mut self, x: f32, y: f32, w: f32, title: &str, icon: &str, tone: &str) {
        self.draw_badge(x, y, 7.4, icon, tone);
        self.draw_wrapped_text_at(
            title,
            x + 10.0,
            y + 0.2,
            w - 10.0,
            11.5,
            BuiltinFont::HelveticaBold,
            if tone == "alert" { rust() } else { leaf() },
            Some(1),
        );
        self.draw_heading_rule_after(x + 10.0, y + 4.6, title, 11.5, x + w, 4.5);
    }

    fn draw_table_header(&mut self, x: f32, y: f32, w: f32, labels: &[&str], widths: &[f32]) {
        self.draw_rect(x, y, w, 7.0, wash(), Some(rule_soft()), 0.2);
        let mut cursor = x;
        for (index, label) in labels.iter().enumerate() {
            let width = widths[index];
            self.draw_text_line(
                label,
                cursor + 2.0,
                y + 4.7,
                6.4,
                BuiltinFont::HelveticaBold,
                ink(),
            );
            cursor += width;
        }
    }

    fn draw_severity_dots(&mut self, x: f32, y: f32, score: u32) {
        for dot in 0..4 {
            self.draw_circle(
                x + dot as f32 * 3.0,
                y,
                1.0,
                if dot < score.min(4) { rust() } else { paper() },
                Some(rgb(0.79, 0.75, 0.71)),
                0.2,
            );
        }
    }

    fn draw_empty_box(&mut self, text: &str, x: f32, y: f32, w: f32, h: f32) {
        self.draw_round_rect(
            x,
            y,
            w,
            h,
            CARD_RADIUS_MM,
            wash(),
            Some(rgb(0.85, 0.82, 0.77)),
            0.35,
        );
        let text_h = measure_wrapped_text(text, w - 12.0, 7.5, None);
        self.draw_wrapped_text_at(
            text,
            x + 6.0,
            y + (h - text_h) / 2.0,
            w - 12.0,
            7.5,
            BuiltinFont::Helvetica,
            muted(),
            None,
        );
    }

    fn draw_badge(&mut self, x: f32, y: f32, size: f32, label: &str, tone: &str) {
        self.draw_circle(
            x + size / 2.0,
            y + size / 2.0,
            size / 2.0,
            tone_bg(tone),
            None,
            0.0,
        );
        if let Some(icon) = icon_for_symbol(label) {
            let icon_size = size * 0.68;
            self.draw_icon_fit(
                icon,
                x + (size - icon_size) / 2.0,
                y + (size - icon_size) / 2.0,
                icon_size,
                icon_size,
            );
            return;
        }
        let text = truncate_chars(label, 2);
        let text_size = (size * 0.43).max(4.0);
        let tx = x + size / 2.0 - text_width_estimate(&text, text_size) / 2.0;
        self.draw_text_line(
            &text,
            tx,
            y + size / 2.0 + text_size * 0.12,
            text_size,
            BuiltinFont::HelveticaBold,
            tone_main(tone),
        );
    }

    fn draw_icon_tile(
        &mut self,
        x: f32,
        y: f32,
        size: f32,
        icon: ReportIcon,
        fallback_label: &str,
        tone: &str,
    ) {
        self.draw_round_rect(
            x,
            y,
            size,
            size,
            size * 0.25,
            leaf_soft(),
            Some(rule_soft()),
            0.35,
        );
        let icon_size = size * 0.78;
        if self.draw_icon_fit(
            icon,
            x + (size - icon_size) / 2.0,
            y + (size - icon_size) / 2.0,
            icon_size,
            icon_size,
        ) {
            return;
        }
        self.draw_text_line(
            fallback_label,
            x + size * 0.32,
            y + size * 0.72,
            size * 0.62,
            BuiltinFont::HelveticaBold,
            tone_main(tone),
        );
    }

    fn draw_patient_avatar(&mut self, x: f32, y: f32, size: f32, color: Color, initial: &str) {
        if let Some(asset) = self.patient.child_avatar_image.clone() {
            self.ops.push(Op::SaveGraphicsState);
            self.clip_circle(x + size / 2.0, y + size / 2.0, size / 2.0);
            self.draw_asset_cover(&asset, x, y, size, size);
            self.ops.push(Op::RestoreGraphicsState);
            self.draw_circle_outline(x + size / 2.0, y + size / 2.0, size / 2.0, paper(), 0.6);
            return;
        }

        self.draw_circle(
            x + size / 2.0,
            y + size / 2.0,
            size / 2.0,
            color,
            Some(paper()),
            0.45,
        );
        self.draw_text_line(
            initial,
            x + size * 0.34,
            y + size * 0.64,
            size * 0.82,
            BuiltinFont::HelveticaBold,
            paper(),
        );
    }

    fn draw_icon_fit(&mut self, icon: ReportIcon, x: f32, y: f32, w: f32, h: f32) -> bool {
        if let Some(asset) = self.assets.get(icon).cloned() {
            self.draw_asset_fit(&asset, x, y, w, h);
            true
        } else {
            false
        }
    }

    fn draw_asset_fit(&mut self, asset: &PdfAsset, x: f32, y: f32, w: f32, h: f32) {
        self.draw_asset(asset, x, y, w, h, ImageFit::Contain);
    }

    fn draw_asset_cover(&mut self, asset: &PdfAsset, x: f32, y: f32, w: f32, h: f32) {
        self.draw_asset(asset, x, y, w, h, ImageFit::Cover);
    }

    fn draw_asset(&mut self, asset: &PdfAsset, x: f32, y: f32, w: f32, h: f32, fit: ImageFit) {
        let base_w_pt = Px(asset.width_px).into_pt(asset.dpi).0;
        let base_h_pt = Px(asset.height_px).into_pt(asset.dpi).0;
        if base_w_pt <= 0.0 || base_h_pt <= 0.0 {
            return;
        }

        let target_w_pt = Mm(w).into_pt().0;
        let target_h_pt = Mm(h).into_pt().0;
        let scale = match fit {
            ImageFit::Contain => (target_w_pt / base_w_pt).min(target_h_pt / base_h_pt),
            ImageFit::Cover => (target_w_pt / base_w_pt).max(target_h_pt / base_h_pt),
        };
        let draw_w_mm = Mm::from(Pt(base_w_pt * scale)).0;
        let draw_h_mm = Mm::from(Pt(base_h_pt * scale)).0;
        let draw_x = x + (w - draw_w_mm) / 2.0;
        let draw_y = y + (h - draw_h_mm) / 2.0;

        self.ops.push(Op::UseXobject {
            id: asset.id.clone(),
            transform: XObjectTransform {
                translate_x: Some(Mm(draw_x).into_pt()),
                translate_y: Some(Mm(PAGE_HEIGHT_MM - draw_y - draw_h_mm).into_pt()),
                scale_x: Some(scale),
                scale_y: Some(scale),
                dpi: Some(asset.dpi),
                ..Default::default()
            },
        });
        self.has_content = true;
    }

    fn clip_circle(&mut self, cx: f32, cy: f32, r: f32) {
        let mut points = Vec::new();
        for index in 0..32 {
            let angle = std::f32::consts::TAU * (index as f32 / 32.0);
            points.push((cx + angle.cos() * r, cy + angle.sin() * r));
        }
        self.draw_polygon_from_top_with_mode(&points, paper(), None, 0.0, PaintMode::Clip);
    }

    fn draw_circle_outline(&mut self, cx: f32, cy: f32, r: f32, color: Color, stroke_width: f32) {
        let mut points = Vec::new();
        for index in 0..32 {
            let angle = std::f32::consts::TAU * (index as f32 / 32.0);
            points.push((cx + angle.cos() * r, cy + angle.sin() * r));
        }
        self.draw_polygon_from_top_with_mode(
            &points,
            paper(),
            Some(color),
            stroke_width,
            PaintMode::Stroke,
        );
    }

    fn draw_round_rect(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        radius: f32,
        fill: Color,
        stroke: Option<Color>,
        stroke_width: f32,
    ) {
        let points = rounded_rect_points(x, y, w, h, radius);
        self.draw_polygon_from_top_with_mode(
            &points,
            fill,
            stroke,
            stroke_width,
            PaintMode::FillStroke,
        );
    }

    fn draw_rect(
        &mut self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        fill: Color,
        stroke: Option<Color>,
        stroke_width: f32,
    ) {
        let points = vec![(x, y), (x + w, y), (x + w, y + h), (x, y + h)];
        let mode = if stroke.is_some() {
            PaintMode::FillStroke
        } else {
            PaintMode::Fill
        };
        self.draw_polygon_from_top_with_mode(&points, fill, stroke, stroke_width, mode);
    }

    fn draw_circle(
        &mut self,
        cx: f32,
        cy: f32,
        r: f32,
        fill: Color,
        stroke: Option<Color>,
        stroke_width: f32,
    ) {
        let mut points = Vec::new();
        for index in 0..32 {
            let angle = std::f32::consts::TAU * (index as f32 / 32.0);
            points.push((cx + angle.cos() * r, cy + angle.sin() * r));
        }
        let mode = if stroke.is_some() {
            PaintMode::FillStroke
        } else {
            PaintMode::Fill
        };
        self.draw_polygon_from_top_with_mode(&points, fill, stroke, stroke_width, mode);
    }

    fn draw_polygon_from_top(
        &mut self,
        points: &[(f32, f32)],
        fill: Color,
        stroke: Option<Color>,
        stroke_width: f32,
    ) {
        let mode = if stroke.is_some() {
            PaintMode::FillStroke
        } else {
            PaintMode::Fill
        };
        self.draw_polygon_from_top_with_mode(points, fill, stroke, stroke_width, mode);
    }

    fn draw_polygon_from_top_with_mode(
        &mut self,
        points: &[(f32, f32)],
        fill: Color,
        stroke: Option<Color>,
        stroke_width: f32,
        mode: PaintMode,
    ) {
        let polygon = Polygon {
            rings: vec![PolygonRing {
                points: points
                    .iter()
                    .map(|(x, y)| LinePoint {
                        p: point_from_top(*x, *y),
                        bezier: false,
                    })
                    .collect(),
            }],
            mode,
            winding_order: WindingOrder::NonZero,
        };
        self.ops.push(Op::SetFillColor { col: fill });
        if let Some(stroke) = stroke {
            self.ops.push(Op::SetOutlineColor { col: stroke });
            self.ops.push(Op::SetOutlineThickness {
                pt: Mm(stroke_width).into(),
            });
        }
        self.ops.push(Op::DrawPolygon { polygon });
        self.has_content = true;
    }

    fn draw_line(&mut self, x1: f32, y1: f32, x2: f32, y2: f32, color: Color, thickness: f32) {
        self.ops.push(Op::SetOutlineColor { col: color });
        self.ops.push(Op::SetOutlineThickness {
            pt: Mm(thickness).into(),
        });
        self.ops.push(Op::DrawLine {
            line: Line {
                points: vec![
                    LinePoint {
                        p: point_from_top(x1, y1),
                        bezier: false,
                    },
                    LinePoint {
                        p: point_from_top(x2, y2),
                        bezier: false,
                    },
                ],
                is_closed: false,
            },
        });
        self.has_content = true;
    }

    fn draw_text_line(
        &mut self,
        text: &str,
        x: f32,
        baseline_y: f32,
        font_size_pt: f32,
        font: BuiltinFont,
        color: Color,
    ) {
        self.ops
            .extend(text_ops(text, x, baseline_y, font_size_pt, font, color));
        self.has_content = true;
    }

    fn draw_wrapped_text_at(
        &mut self,
        text: &str,
        x: f32,
        top_y: f32,
        max_width: f32,
        font_size_pt: f32,
        font: BuiltinFont,
        color: Color,
        max_lines: Option<usize>,
    ) -> f32 {
        let line_height = pt_to_mm(font_size_pt * 1.22);
        let mut lines = wrap_text(text, max_width, font_size_pt);
        if let Some(max_lines) = max_lines {
            if lines.len() > max_lines {
                lines.truncate(max_lines);
                if let Some(last) = lines.last_mut() {
                    *last = truncate_to_width(last, max_width, font_size_pt);
                }
            }
        }
        if lines.is_empty() {
            return 0.0;
        }
        for (index, line) in lines.iter().enumerate() {
            self.draw_text_line(
                line,
                x,
                top_y + pt_to_mm(font_size_pt) + index as f32 * line_height,
                font_size_pt,
                font,
                color.clone(),
            );
        }
        lines.len() as f32 * line_height
    }
}

fn footer_ops(footer: &str, page_number: usize, total_pages: usize) -> Vec<Op> {
    let mut ops = Vec::new();
    ops.extend(line_ops(
        PAGE_PAD_X_MM,
        FOOTER_TOP_MM,
        PAGE_WIDTH_MM - PAGE_PAD_X_MM,
        FOOTER_TOP_MM,
        rule(),
        0.3,
    ));
    ops.extend(circle_ops(
        PAGE_PAD_X_MM + 3.5,
        FOOTER_TOP_MM + 5.0,
        3.2,
        leaf_soft(),
        None,
        0.0,
    ));
    ops.extend(text_ops(
        "L",
        PAGE_PAD_X_MM + 2.55,
        FOOTER_TOP_MM + 6.1,
        5.0,
        BuiltinFont::HelveticaBold,
        leaf(),
    ));

    let lines = wrap_text(footer, 138.0, 7.2);
    for (index, line) in lines.iter().take(2).enumerate() {
        ops.extend(text_ops(
            line,
            PAGE_PAD_X_MM + 10.0,
            FOOTER_TOP_MM + 4.2 + index as f32 * 3.6,
            7.2,
            BuiltinFont::HelveticaOblique,
            body(),
        ));
    }
    ops.extend(text_ops(
        &format!("Page {} of {}", page_number, total_pages),
        PAGE_WIDTH_MM - PAGE_PAD_X_MM - 22.0,
        FOOTER_TOP_MM + 5.7,
        8.5,
        BuiltinFont::Helvetica,
        ink(),
    ));
    ops
}

fn page_background_ops() -> Vec<Op> {
    let mut ops = Vec::new();
    ops.extend(rect_ops(
        0.0,
        0.0,
        PAGE_WIDTH_MM,
        PAGE_HEIGHT_MM,
        paper(),
        None,
        0.0,
    ));
    ops.extend(circle_ops(
        25.0,
        8.0,
        42.0,
        rgb(0.996, 0.953, 0.894),
        None,
        0.0,
    ));
    ops.extend(circle_ops(
        193.0,
        12.0,
        35.0,
        rgb(0.958, 0.948, 0.910),
        None,
        0.0,
    ));
    ops
}

fn rect_ops(
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    fill: Color,
    stroke: Option<Color>,
    stroke_width: f32,
) -> Vec<Op> {
    polygon_ops(
        &[(x, y), (x + w, y), (x + w, y + h), (x, y + h)],
        fill,
        stroke,
        stroke_width,
    )
}

fn circle_ops(
    cx: f32,
    cy: f32,
    r: f32,
    fill: Color,
    stroke: Option<Color>,
    stroke_width: f32,
) -> Vec<Op> {
    let mut points = Vec::new();
    for index in 0..32 {
        let angle = std::f32::consts::TAU * (index as f32 / 32.0);
        points.push((cx + angle.cos() * r, cy + angle.sin() * r));
    }
    polygon_ops(&points, fill, stroke, stroke_width)
}

fn line_ops(x1: f32, y1: f32, x2: f32, y2: f32, color: Color, thickness: f32) -> Vec<Op> {
    vec![
        Op::SetOutlineColor { col: color },
        Op::SetOutlineThickness {
            pt: Mm(thickness).into(),
        },
        Op::DrawLine {
            line: Line {
                points: vec![
                    LinePoint {
                        p: point_from_top(x1, y1),
                        bezier: false,
                    },
                    LinePoint {
                        p: point_from_top(x2, y2),
                        bezier: false,
                    },
                ],
                is_closed: false,
            },
        },
    ]
}

fn polygon_ops(
    points: &[(f32, f32)],
    fill: Color,
    stroke: Option<Color>,
    stroke_width: f32,
) -> Vec<Op> {
    let mut ops = vec![Op::SetFillColor { col: fill }];
    let mode = if let Some(stroke) = stroke {
        ops.push(Op::SetOutlineColor { col: stroke });
        ops.push(Op::SetOutlineThickness {
            pt: Mm(stroke_width).into(),
        });
        PaintMode::FillStroke
    } else {
        PaintMode::Fill
    };
    ops.push(Op::DrawPolygon {
        polygon: Polygon {
            rings: vec![PolygonRing {
                points: points
                    .iter()
                    .map(|(x, y)| LinePoint {
                        p: point_from_top(*x, *y),
                        bezier: false,
                    })
                    .collect(),
            }],
            mode,
            winding_order: WindingOrder::NonZero,
        },
    });
    ops
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
            pos: point_from_top(x_mm, y_from_top_mm),
        },
        Op::ShowText {
            items: vec![TextItem::Text(sanitize_text(text))],
        },
        Op::EndTextSection,
    ]
}

fn point_from_top(x_mm: f32, y_from_top_mm: f32) -> Point {
    Point::new(Mm(x_mm), Mm(PAGE_HEIGHT_MM - y_from_top_mm))
}

fn rounded_rect_points(x: f32, y: f32, w: f32, h: f32, radius: f32) -> Vec<(f32, f32)> {
    let r = radius.min(w / 2.0).min(h / 2.0).max(0.0);
    let corners = [
        (x + w - r, y + r, -90.0_f32, 0.0_f32),
        (x + w - r, y + h - r, 0.0_f32, 90.0_f32),
        (x + r, y + h - r, 90.0_f32, 180.0_f32),
        (x + r, y + r, 180.0_f32, 270.0_f32),
    ];
    let mut points = Vec::new();
    for (cx, cy, start, end) in corners {
        for step in 0..=4 {
            let angle = (start + (end - start) * (step as f32 / 4.0)).to_radians();
            points.push((cx + angle.cos() * r, cy + angle.sin() * r));
        }
    }
    points
}

fn register_png_asset(doc: &mut PdfDocument, bytes: &[u8]) -> Option<PdfAsset> {
    let mut warnings = Vec::new();
    let image = RawImage::decode_from_bytes(bytes, &mut warnings).ok()?;
    register_raw_image(doc, image)
}

fn register_data_url_image(doc: &mut PdfDocument, data_url: &str) -> Option<PdfAsset> {
    let encoded = data_url
        .split_once(',')
        .map(|(_, value)| value)
        .unwrap_or(data_url);
    let bytes = STANDARD.decode(encoded).ok()?;
    let mut warnings = Vec::new();
    let image = RawImage::decode_from_bytes(&bytes, &mut warnings).ok()?;
    register_raw_image(doc, image)
}

fn register_raw_image(doc: &mut PdfDocument, image: RawImage) -> Option<PdfAsset> {
    let width_px = image.width;
    let height_px = image.height;
    let id = doc.add_image(&image);
    Some(PdfAsset {
        id,
        width_px,
        height_px,
        dpi: 300.0,
    })
}

fn icon_for_symbol(symbol: &str) -> Option<ReportIcon> {
    match symbol {
        "brand" => Some(ReportIcon::Brand),
        "poop" | "stool" | "stool-type" | "stool-colour" => Some(ReportIcon::Poop),
        "diaper" => Some(ReportIcon::Diaper),
        "diaper-wet" | "hydration" | "urine" => Some(ReportIcon::DiaperWet),
        "diaper-dirty" => Some(ReportIcon::DiaperDirty),
        "diaper-mixed" => Some(ReportIcon::DiaperMixed),
        "feed" | "bottle" | "solids" => Some(ReportIcon::Feed),
        "breastfeed" => Some(ReportIcon::Breastfeed),
        "symptom" => Some(ReportIcon::Symptom),
        "episode" => Some(ReportIcon::Episode),
        _ => None,
    }
}

fn metric_value_font_size(value: &str, max_width_mm: f32) -> f32 {
    let char_count = value.chars().count();
    if char_count <= 3 && text_width_estimate(value, 17.0) <= max_width_mm {
        17.0
    } else if char_count <= 7 && text_width_estimate(value, 15.0) <= max_width_mm {
        15.0
    } else if text_width_estimate(value, 12.0) <= max_width_mm {
        12.0
    } else {
        9.8
    }
}

fn measure_event_row_height(event: &ReportEvent, width: f32) -> f32 {
    let detail_w = (width - 51.0).max(24.0);
    let label_h = measure_wrapped_text(&event.label, 29.0, 7.8, Some(2));
    let value_h = measure_wrapped_text(&event.value, detail_w, 7.2, Some(3));
    let detail_h = measure_wrapped_text(&event.detail, detail_w, 6.3, Some(3));
    13.2_f32.max(label_h.max(value_h + detail_h + 0.8) + 4.0)
}

fn measure_info_row_height(row: &InfoRow, width: f32, compact: bool) -> f32 {
    let label_w = if compact { width * 0.34 } else { width * 0.36 };
    let value_w = width - if compact { width * 0.48 } else { width * 0.52 } - 3.5;
    let value_font = if compact { 8.0 } else { 9.4 };
    let detail_font = if compact { 5.6 } else { 5.8 };
    let label_h = measure_wrapped_text(&row.label, label_w, 7.0, Some(3));
    let value_h = measure_wrapped_text(&row.value, value_w, value_font, Some(3));
    let detail_h = row
        .detail
        .as_deref()
        .map(|detail| measure_wrapped_text(detail, value_w, detail_font, Some(3)) + 0.8)
        .unwrap_or(0.0);
    let min_h: f32 = if compact { 8.8 } else { 10.5 };
    min_h.max(label_h.max(value_h + detail_h) + 3.2)
}

fn measure_clinical_row_height(row: &ClinicalNote, width: f32) -> f32 {
    let topic_h = measure_wrapped_text(&row.topic, 27.0, 6.8, Some(2));
    let note_h = measure_wrapped_text(&row.note, width - 48.0, 6.8, None);
    10.4_f32.max(topic_h.max(note_h) + 4.0)
}

fn measure_episode_item_height(row: &InfoRow, width: f32) -> f32 {
    let text_w = width - 10.5;
    let value_h = measure_wrapped_text(&row.value, text_w, 6.4, Some(2));
    let detail_h = row
        .detail
        .as_deref()
        .map(|detail| measure_wrapped_text(detail, text_w, 5.3, Some(2)) + 0.8)
        .unwrap_or(0.0);
    13.5_f32.max(value_h + detail_h + 7.0)
}

fn symptom_table_widths(panel_width: f32) -> [f32; 4] {
    let inner = panel_width - 6.0;
    [28.0, 14.0, 20.0, inner - 62.0]
}

fn feeding_table_widths(panel_width: f32) -> [f32; 3] {
    let inner = panel_width - 6.0;
    [28.0, 12.0, inner - 40.0]
}

fn measure_symptom_row_height(row: &SymptomSummaryRow, width: f32) -> f32 {
    let widths = symptom_table_widths(width);
    let symptom_h = measure_wrapped_text(&row.symptom, widths[0] - 9.0, 6.2, None);
    let latest_h = measure_wrapped_text(&row.latest, widths[2] - 3.0, 5.8, None);
    let note_h = measure_wrapped_text(&row.note, widths[3] - 3.0, 6.0, None);
    10.0_f32.max(symptom_h.max(latest_h).max(note_h) + 4.0)
}

fn measure_feeding_row_height(row: &FeedingSummaryRow, width: f32) -> f32 {
    let widths = feeding_table_widths(width);
    let type_h = measure_wrapped_text(&row.r#type, widths[0] - 9.0, 6.4, None);
    let entries_h = measure_wrapped_text(&row.entries, widths[1] - 3.0, 6.2, None);
    let notes_h = measure_wrapped_text(&row.notes, widths[2] - 3.0, 6.2, None);
    10.0_f32.max(type_h.max(entries_h).max(notes_h) + 4.0)
}

fn wrap_text(text: &str, max_width_mm: f32, font_size_pt: f32) -> Vec<String> {
    let cleaned = sanitize_text(text).trim().to_string();
    if cleaned.is_empty() {
        return Vec::new();
    }

    let approx_char_width_mm = (font_size_pt * 0.50) * 25.4 / 72.0;
    let max_chars = ((max_width_mm / approx_char_width_mm).floor() as usize).max(8);
    let mut lines = Vec::new();
    let mut current = String::new();

    for word in cleaned.split_whitespace() {
        let chunks = split_long_word(word, max_chars);
        for chunk in chunks {
            if current.is_empty() {
                current.push_str(&chunk);
                continue;
            }

            let next_len = current.chars().count() + 1 + chunk.chars().count();
            if next_len <= max_chars {
                current.push(' ');
                current.push_str(&chunk);
            } else {
                lines.push(current);
                current = chunk;
            }
        }
    }

    if !current.is_empty() {
        lines.push(current);
    }

    lines
}

fn split_long_word(word: &str, max_chars: usize) -> Vec<String> {
    if word.chars().count() <= max_chars {
        return vec![word.to_string()];
    }
    let mut chunks = Vec::new();
    let chars: Vec<char> = word.chars().collect();
    for chunk in chars.chunks(max_chars) {
        chunks.push(chunk.iter().collect());
    }
    chunks
}

fn measure_wrapped_text(
    text: &str,
    max_width_mm: f32,
    font_size_pt: f32,
    max_lines: Option<usize>,
) -> f32 {
    let line_count = wrap_text(text, max_width_mm, font_size_pt).len();
    let line_count = max_lines.map_or(line_count, |max| line_count.min(max));
    line_count as f32 * pt_to_mm(font_size_pt * 1.22)
}

fn truncate_to_width(text: &str, max_width_mm: f32, font_size_pt: f32) -> String {
    let approx_char_width_mm = (font_size_pt * 0.50) * 25.4 / 72.0;
    let max_chars = ((max_width_mm / approx_char_width_mm).floor() as usize).max(8);
    let mut value = truncate_chars(text, max_chars.saturating_sub(3));
    if value.chars().count() < text.chars().count() {
        value.push_str("...");
    }
    value
}

fn truncate_chars(text: &str, max_chars: usize) -> String {
    text.chars().take(max_chars).collect()
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

fn chart_scale_max(values: Vec<u32>) -> u32 {
    let max = values.into_iter().max().unwrap_or(0);
    if max <= 3 {
        3
    } else if max <= 6 {
        max
    } else {
        ((max + 1) / 2) * 2
    }
}

fn timeline_widths() -> [f32; 4] {
    [31.0, 39.0, CONTENT_WIDTH_MM - 31.0 - 39.0 - 38.0, 38.0]
}

fn label_icon(label: &str) -> &str {
    let value = label.to_lowercase();
    if value.contains("breast") {
        "breastfeed"
    } else if value.contains("feed")
        || value.contains("bottle")
        || value.contains("formula")
        || value.contains("solid")
    {
        "feed"
    } else if value.contains("mixed") {
        "diaper-mixed"
    } else if value.contains("dirty") {
        "diaper-dirty"
    } else if value.contains("wet") || value.contains("urine") || value.contains("hydration") {
        "diaper-wet"
    } else if value.contains("diaper") {
        "diaper"
    } else if value.contains("red")
        || value.contains("flag")
        || value.contains("colour")
        || value.contains("color")
    {
        "poop"
    } else if value.contains("episode") {
        "episode"
    } else if value.contains("symptom")
        || value.contains("fever")
        || value.contains("temp")
        || value.contains("cough")
        || value.contains("rash")
        || value.contains("appetite")
    {
        "symptom"
    } else if value.contains("stool")
        || value.contains("poop")
        || value.contains("consistency")
        || value.contains("no-poop")
    {
        "poop"
    } else if value.contains("type") || value.contains("pattern") || value.contains("trend") {
        "poop"
    } else if value.contains("date")
        || value.contains("latest")
        || value.contains("last")
        || value.contains("start")
    {
        "D"
    } else {
        "i"
    }
}

fn color_from_hex(hex: &str, fallback: Color) -> Color {
    let value = hex.trim().trim_start_matches('#');
    if value.len() != 6 {
        return fallback;
    }
    let Ok(red) = u8::from_str_radix(&value[0..2], 16) else {
        return fallback;
    };
    let Ok(green) = u8::from_str_radix(&value[2..4], 16) else {
        return fallback;
    };
    let Ok(blue) = u8::from_str_radix(&value[4..6], 16) else {
        return fallback;
    };
    rgb(
        red as f32 / 255.0,
        green as f32 / 255.0,
        blue as f32 / 255.0,
    )
}

fn tone_main(tone: &str) -> Color {
    match tone {
        "alert" => rust(),
        "caution" => rgb(0.63, 0.40, 0.15),
        "info" | "healthy" => leaf(),
        _ => leaf(),
    }
}

fn tone_bg(tone: &str) -> Color {
    match tone {
        "alert" => rust_soft(),
        "caution" => rgb(1.0, 0.945, 0.847),
        "info" | "healthy" => leaf_soft(),
        _ => leaf_soft(),
    }
}

fn tone_border(tone: &str) -> Color {
    match tone {
        "alert" => rgb(0.94, 0.78, 0.74),
        "caution" => rgb(0.93, 0.84, 0.68),
        "info" | "healthy" => rgb(0.83, 0.86, 0.79),
        _ => rule_soft(),
    }
}

fn text_width_estimate(text: &str, font_size_pt: f32) -> f32 {
    text.chars().count() as f32 * (font_size_pt * 0.50) * 25.4 / 72.0
}

fn pt_to_mm(pt: f32) -> f32 {
    pt * 25.4 / 72.0
}

fn rgb(r: f32, g: f32, b: f32) -> Color {
    Color::Rgb(Rgb::new(r, g, b, None))
}

fn paper() -> Color {
    rgb(1.0, 0.992, 0.973)
}

fn rgba_paper() -> Color {
    rgb(1.0, 0.996, 0.980)
}

fn wash() -> Color {
    rgb(0.980, 0.965, 0.937)
}

fn wash_soft() -> Color {
    rgb(1.0, 0.957, 0.914)
}

fn ink() -> Color {
    rgb(0.125, 0.106, 0.110)
}

fn body() -> Color {
    rgb(0.188, 0.173, 0.173)
}

fn muted() -> Color {
    rgb(0.404, 0.392, 0.365)
}

fn rule() -> Color {
    rgb(0.851, 0.824, 0.773)
}

fn rule_soft() -> Color {
    rgb(0.922, 0.894, 0.855)
}

fn leaf() -> Color {
    rgb(0.361, 0.420, 0.322)
}

fn leaf_soft() -> Color {
    rgb(0.925, 0.933, 0.902)
}

fn rust() -> Color {
    rgb(0.784, 0.314, 0.196)
}

fn rust_soft() -> Color {
    rgb(0.980, 0.902, 0.867)
}

fn gold_soft() -> Color {
    rgb(0.918, 0.824, 0.678)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn metric(label: &str, value: &str) -> Metric {
        Metric {
            label: label.to_string(),
            value: value.to_string(),
            tone: "default".to_string(),
        }
    }

    fn row(label: &str, value: &str) -> InfoRow {
        InfoRow {
            label: label.to_string(),
            value: value.to_string(),
            detail: Some("Detail".to_string()),
            tone: Some("default".to_string()),
        }
    }

    fn sample_payload() -> NativeReportPdfPayload {
        let daily_points = vec![
            DailyPoint {
                weekday: "Fri".to_string(),
                date_label: "May 1".to_string(),
                stool_count: 1,
                no_poop_count: 0,
                wet_only: 2,
                dirty_only: 0,
                mixed: 1,
            },
            DailyPoint {
                weekday: "Sat".to_string(),
                date_label: "May 2".to_string(),
                stool_count: 2,
                no_poop_count: 0,
                wet_only: 1,
                dirty_only: 1,
                mixed: 0,
            },
        ];

        NativeReportPdfPayload {
            title: "Poop & Tummy Report".to_string(),
            child_name: "Maya".to_string(),
            child_avatar_color: "#8b9b76".to_string(),
            child_avatar_data_url: None,
            age_label: "7 months old".to_string(),
            dob_label: "2025-10-03".to_string(),
            feeding_label: "Mixed".to_string(),
            period_label: "2026-05-01 to 2026-05-04".to_string(),
            generated_label: "4 May 2026 at 3:50 pm".to_string(),
            disclaimer: "This report summarizes logs from Tiny Tummy. It does not diagnose or replace medical advice.".to_string(),
            privacy_footer: "Generated locally by Tiny Tummy. Your baby's data stays on your device unless you choose to export or share this report.".to_string(),
            brief: BriefModel {
                summary: "Over this period, Maya had 3 stool logs, 3 wet diapers, and no red-flag stool entries. Logging was sparse, so dated events may be more useful than averages.".to_string(),
                concerns: vec![
                    BriefRow { label: "Stool signal".to_string(), value: "No red flags".to_string(), detail: "Review stool frequency, type, colour, notes, and any attached photos.".to_string(), tone: "default".to_string() },
                    BriefRow { label: "Symptoms / episode".to_string(), value: "None".to_string(), detail: "No active episode or symptom pattern was highlighted in this period.".to_string(), tone: "default".to_string() },
                    BriefRow { label: "Diaper / hydration".to_string(), value: "3 wet".to_string(), detail: "Wet and dirty diaper output is summarized for hydration context.".to_string(), tone: "info".to_string() },
                    BriefRow { label: "Data quality".to_string(), value: "Sparse".to_string(), detail: "Dated events may be more useful than averages.".to_string(), tone: "caution".to_string() },
                ],
                questions: vec!["Are these stool patterns expected for this age and feeding stage?".to_string()],
                last_important_events: vec![ReportEvent { label: "Last poop".to_string(), value: "May 2".to_string(), detail: "Type 4 - yellow".to_string(), tone: "default".to_string() }],
                metrics: vec![metric("Stool count", "3"), metric("Wet diapers", "3"), metric("Dirty diapers", "1")],
            },
            pattern: PatternModel {
                metrics: vec![metric("Stool count", "3"), metric("No-poop days", "0"), metric("Wet diapers", "3"), metric("Dirty diapers", "1"), metric("Mixed diapers", "1")],
                daily_points,
                no_poop_dates: vec![],
                stool_type_trend: vec![TypeTrendPoint { date_label: "May 1".to_string(), label: "T4".to_string(), tone: "default".to_string() }],
                colour_breakdown: vec![ColourBreakdownItem { label: "Yellow".to_string(), value: "yellow".to_string(), count: 2, percent: 67, color: "#d6a33f".to_string(), is_red_flag: false }],
                hydration_rows: vec![row("Urine colour", "normal (3)"), row("Dark urine logged", "None")],
                clinical_notes: vec![ClinicalNote { topic: "Stool signal".to_string(), note: "Review dated entries for type, colour, notes, and photos.".to_string(), tone: "default".to_string() }],
            },
            context: ContextModel {
                care_notes: vec![row("Care notes", "No specific tummy concern signal was highlighted")],
                poop_summary_rows: vec![row("Stool events", "3 stool logs"), row("Red-flag colours", "None logged")],
                diaper_rows: vec![row("Wet diapers", "3"), row("Mixed diapers", "1")],
                episode_rows: vec![row("Episode", "None logged")],
                symptom_rows: vec![],
                feeding_rows: vec![FeedingSummaryRow { r#type: "Bottle".to_string(), entries: "2".to_string(), notes: "240 ml total logged volume".to_string() }],
            },
            timeline_groups: vec![TimelineGroup {
                date_label: "May 1".to_string(),
                rows: vec![TimelineRow { time: "9:00 AM".to_string(), event: "Stool".to_string(), details: "Type 4 - Color yellow".to_string(), note: "Soft yellow stool".to_string(), tone: "default".to_string() }],
            }],
        }
    }

    #[test]
    fn generates_a_valid_native_report_pdf() {
        let encoded = generate_native_report_pdf(sample_payload()).expect("pdf should generate");
        let bytes = STANDARD.decode(encoded).expect("should decode pdf bytes");
        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 1000);
    }
}
