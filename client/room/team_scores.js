// модуль для начисления очков в команду
// комментарии — на русском

export const TEAM_SCORES_MUL = 0.08;
const SCORES_PROP_NAME = "Scores";

// добавляет очки в команду с масштабированием 8% от очков игрока
export function addTeamScores(team, playerScoresToScale) {
	if (!team) return;
	const scaled = Math.round((playerScoresToScale | 0) * TEAM_SCORES_MUL);
	if (scaled <= 0) return;
	const teamProp = team.Properties ? team.Properties.Get(SCORES_PROP_NAME) : null;
	if (teamProp) teamProp.Value += scaled;
}

// добавляет очки в команду без масштабирования (сырые очки команды)
export function addTeamScoresRaw(team, teamScores) {
	if (!team) return;
	const add = teamScores | 0;
	if (add === 0) return;
	const teamProp = team.Properties ? team.Properties.Get(SCORES_PROP_NAME) : null;
	if (teamProp) teamProp.Value += add;
}
