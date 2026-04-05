import { Color } from 'pixel_combats/basic';
import { Teams } from 'pixel_combats/room';

export const TEAM_NAME_1 = "Team1";
export const TEAM_NAME_2 = "Team2";

export const DISPLAY_NAME = "by xJetryy";

export const TEAM1_SPAWN = 1;
export const TEAM2_SPAWN = 2;

// цвет команды
const BLACK_COLOR = new Color(0, 0, 0, 1);

export function create_team_1() {
    Teams.Add(TEAM_NAME_1, DISPLAY_NAME, BLACK_COLOR);
    Teams.Get(TEAM_NAME_1).Spawns.SpawnPointsGroups.Add(TEAM1_SPAWN);
    return Teams.Get(TEAM_NAME_1);
}

export function create_team_2() {
    Teams.Add(TEAM_NAME_2, DISPLAY_NAME, BLACK_COLOR);
    Teams.Get(TEAM_NAME_2).Spawns.SpawnPointsGroups.Add(TEAM2_SPAWN);
    return Teams.Get(TEAM_NAME_2);
}
