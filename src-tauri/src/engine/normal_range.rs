use super::ChildInfo;
use chrono::{NaiveDate, Utc};

/// Returns (alert_type, severity, title, message) if an alert should fire
pub fn check_frequency_alert(
    child: &ChildInfo,
    last_poop_at: &str,
) -> Option<(String, String, String, String)> {
    let dob = NaiveDate::parse_from_str(&child.date_of_birth, "%Y-%m-%d").ok()?;
    let age_weeks = (Utc::now().date_naive() - dob).num_days() / 7;

    let last_poop =
        chrono::NaiveDateTime::parse_from_str(last_poop_at, "%Y-%m-%dT%H:%M:%S").ok()?;
    let hours_since = (Utc::now().naive_utc() - last_poop).num_hours();
    let days_since = hours_since as f64 / 24.0;

    let warning_after_days = get_warning_threshold(age_weeks, &child.feeding_type);

    if days_since >= warning_after_days {
        let severity = if days_since >= warning_after_days * 1.5 {
            "urgent"
        } else {
            "warning"
        };

        let normal_desc = get_normal_description(age_weeks, &child.feeding_type);

        Some((
            "no_poop_warning".to_string(),
            severity.to_string(),
            format!(
                "It's been {:.0} days since {}'s last poop",
                days_since, child.name
            ),
            format!(
                "{}. Consider consulting your pediatrician if this continues.",
                normal_desc
            ),
        ))
    } else {
        None
    }
}

/// Returns (alert_type, severity, title, message) for red-flag colors
pub fn check_color_alert(
    child: &ChildInfo,
    color: &str,
) -> Option<(String, String, String, String)> {
    let dob = NaiveDate::parse_from_str(&child.date_of_birth, "%Y-%m-%d").ok()?;
    let age_days = (Utc::now().date_naive() - dob).num_days();

    match color {
        "white" => Some((
            "red_flag_color".to_string(),
            "urgent".to_string(),
            "White/pale stool detected".to_string(),
            "White or very pale stools can indicate a bile duct issue (biliary atresia). Contact your pediatrician promptly.".to_string(),
        )),
        "red" => Some((
            "red_flag_color".to_string(),
            "urgent".to_string(),
            "Red stool detected".to_string(),
            "Red stools may contain blood. While some foods (beets, red drinks) can cause this, it's worth mentioning to your pediatrician.".to_string(),
        )),
        "black" if age_days > 3 => Some((
            "red_flag_color".to_string(),
            "urgent".to_string(),
            "Black stool detected".to_string(),
            "Black stools after the newborn period may indicate upper GI bleeding. Contact your pediatrician.".to_string(),
        )),
        _ => None,
    }
}

fn get_warning_threshold(age_weeks: i64, feeding_type: &str) -> f64 {
    match (age_weeks, feeding_type) {
        (0..=5, "breast") => 2.0,
        (0..=5, _) => 3.0,
        (6..=25, "breast") => 8.0,
        (6..=25, _) => 4.0,
        (26..=51, _) => 4.0,
        (52..=155, _) => 4.0,
        _ => 4.0,
    }
}

fn get_normal_description(age_weeks: i64, feeding_type: &str) -> String {
    match (age_weeks, feeding_type) {
        (0..=5, "breast") => {
            "Breastfed newborns typically poop 3-12 times per day".to_string()
        }
        (0..=5, _) => {
            "Formula-fed newborns typically poop 1-4 times per day".to_string()
        }
        (6..=25, "breast") => {
            "Breastfed babies at this age can normally go up to 7 days between poops".to_string()
        }
        (6..=25, _) => {
            "Formula-fed babies at this age typically poop 1-3 times per day".to_string()
        }
        (26..=51, _) => {
            "Babies 6-12 months typically poop 1-3 times per day".to_string()
        }
        (52..=155, _) => "Toddlers typically poop 1-2 times per day".to_string(),
        _ => "Normal frequency varies by age".to_string(),
    }
}

pub fn get_status_for_child(
    dob: &str,
    feeding_type: &str,
    last_poop_at: Option<&str>,
) -> (String, String) {
    let dob = match NaiveDate::parse_from_str(dob, "%Y-%m-%d") {
        Ok(d) => d,
        Err(_) => return ("unknown".to_string(), "Unable to determine status".to_string()),
    };

    let age_weeks = (Utc::now().date_naive() - dob).num_days() / 7;
    let warning_days = get_warning_threshold(age_weeks, feeding_type);

    if let Some(last_at) = last_poop_at {
        if let Ok(last) = chrono::NaiveDateTime::parse_from_str(last_at, "%Y-%m-%dT%H:%M:%S") {
            let days_since = (Utc::now().naive_utc() - last).num_hours() as f64 / 24.0;
            let ratio = days_since / warning_days;

            let status = if ratio < 0.5 {
                "healthy"
            } else if ratio < 1.0 {
                "caution"
            } else {
                "alert"
            };

            let desc = get_normal_description(age_weeks, feeding_type);
            return (status.to_string(), desc);
        }
    }

    let desc = get_normal_description(age_weeks, feeding_type);
    ("healthy".to_string(), desc)
}
