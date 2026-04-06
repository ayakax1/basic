import { Color } from 'pixel_combats/basic';
import { Teams, GameMode } from 'pixel_combats/room';

// === КОНСТАНТЫ ===
const TEAM_1 = "Team1";
const TEAM_2 = "Team2";

const COLOR_1 = new Color(0, 0, 0, 1);
const COLOR_2 = new Color(0.15, 0.15, 0.15, 1);

// === СОЗДАНИЕ КОМАНД ===
Teams.Add(TEAM_1, "Черные", COLOR_1);
Teams.Add(TEAM_2, "Тени", COLOR_2);

// === СПАВН ГРУППЫ ===
Teams.Get(TEAM_1).Spawns.SpawnPointsGroups.Add(1);
Teams.Get(TEAM_2).Spawns.SpawnPointsGroups.Add(2);

// === БЕСКОНЕЧНЫЙ РЕЖИМ ===
let timer = GameMode.Parameters.Get("Timer");
if (timer) timer.Value = 999999;

let maxKills = GameMode.Parameters.Get("MaxKills");
if (maxKills) maxKills.Value = 0;

// === ВЫБОР КОМАНДЫ ===
Teams.OnRequestJoinTeam.Add(function(player, team){
    if (!team) return;

    team.Add(player);
});

// ❗ НЕ ДЕЛАЕМ СПАВН ТУТ (избегаем двойного спавна)

// === АВТО-РЕСПАВН ===
Teams.OnPlayerDie.Add(function(player){

    setTimeout(function(){

        // проверка чтобы не крашилось
        if (!player) return;

        // если вдруг уже жив — не спавним
        if (player.IsAlive) return;

        player.Spawns.Spawn();

    }, 3000);

});