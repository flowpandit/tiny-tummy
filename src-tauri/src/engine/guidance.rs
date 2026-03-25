use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct GuidanceTip {
    pub id: String,
    pub category: String,
    pub title: String,
    pub body: String,
    pub severity: String,
}

pub fn get_all_tips() -> Vec<GuidanceTip> {
    vec![
        GuidanceTip {
            id: "solids-transition".to_string(),
            category: "Feeding Changes".to_string(),
            title: "Starting solids? Expect changes".to_string(),
            body: "When babies start solid foods (around 6 months), stool color, consistency, and frequency often change. This is normal. Stools may become firmer, darker, and less frequent. Introduce new foods one at a time to identify any that cause issues.".to_string(),
            severity: "info".to_string(),
        },
        GuidanceTip {
            id: "formula-switch".to_string(),
            category: "Feeding Changes".to_string(),
            title: "Switching formulas".to_string(),
            body: "Changing formula brands or types can temporarily affect bowel patterns. Give your baby 1-2 weeks to adjust before becoming concerned. If constipation persists, talk to your pediatrician about trying a different formula.".to_string(),
            severity: "info".to_string(),
        },
        GuidanceTip {
            id: "breastfed-normal".to_string(),
            category: "Normal Patterns".to_string(),
            title: "Breastfed babies after 6 weeks".to_string(),
            body: "It's completely normal for breastfed babies older than 6 weeks to go 5-7 days between poops. Breast milk is so efficiently absorbed that there's little waste. As long as the stool is soft when it does come, this is not constipation.".to_string(),
            severity: "info".to_string(),
        },
        GuidanceTip {
            id: "infant-dyschezia".to_string(),
            category: "Normal Patterns".to_string(),
            title: "Straining doesn't always mean constipation".to_string(),
            body: "Infant dyschezia is when babies strain, cry, or turn red while pooping — even though the stool is soft. This happens because babies are still learning to coordinate their abdominal muscles with pelvic floor relaxation. It usually resolves by 3-4 months.".to_string(),
            severity: "info".to_string(),
        },
        GuidanceTip {
            id: "toilet-training".to_string(),
            category: "Toddlers".to_string(),
            title: "Toilet training regression".to_string(),
            body: "Many toddlers withhold stool during toilet training, which can lead to constipation. Signs include crossing legs, hiding, or refusing to sit on the toilet. Don't force it — take a break if needed. Ensure adequate fiber and fluid intake.".to_string(),
            severity: "caution".to_string(),
        },
        GuidanceTip {
            id: "when-to-call".to_string(),
            category: "When to Call the Doctor".to_string(),
            title: "Call your pediatrician if you notice...".to_string(),
            body: "• White, pale, or clay-colored stools (possible bile duct issue)\n• Blood in the stool (red or black after the newborn period)\n• Severe abdominal distension or vomiting with constipation\n• No stool AND no gas for more than 24 hours in a newborn\n• Your baby seems to be in significant pain\n• Constipation that doesn't improve with dietary changes after a week".to_string(),
            severity: "urgent".to_string(),
        },
        GuidanceTip {
            id: "home-remedies".to_string(),
            category: "Home Remedies".to_string(),
            title: "Gentle constipation relief".to_string(),
            body: "For babies on solids: increase water, offer high-fiber foods (prunes, pears, peas). For younger babies: bicycle legs gently, warm bath, tummy massage in clockwise circles. Never give laxatives or suppositories without pediatrician guidance.".to_string(),
            severity: "info".to_string(),
        },
    ]
}
