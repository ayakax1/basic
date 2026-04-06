import { Color } from 'pixel_combats/basic';
import { Teams, GameMode, Spawns } from 'pixel_combats/room';

// 1. Константы
const TEAM_NAME_1 = "Team1";
const TEAM_NAME_2 = "Team2";
const DISPLAY_NAME = "by xJetryy";
const BLACK_COLOR = new Color(0, 0, 0, 1);

// 2. Создаем команды сразу
Teams.Add(TEAM_NAME_1, "Черные " + DISPLAY_NAME, BLACK_COLOR);
Teams.Add(TEAM_NAME_2, "Тени " + DISPLAY_NAME, BLACK_COLOR);

// Настраиваем точки спавна для каждой команды
Teams.Get(TEAM_NAME_1).Spawns.SpawnPointsGroups.Add(1);
Teams.Get(TEAM_NAME_2).Spawns.SpawnPointsGroups.Add(2);

// 3. БЕСКОНЕЧНОСТЬ: Отключаем таймер
GameMode.Parameters.Get("Timer").Value = 0; // В PC2 значение 0 обычно делает таймер бесконечным или отключает его
GameMode.Parameters.Get("MaxKills").Value = 0; // Игра не кончится по киллам

// 4. ЛОГИКА ВХОДА
// Когда игрок выбирает команду в меню
Teams.OnRequestJoinTeam.Add(function(player, team){
    team.Add(player);
});

// Когда игрок зашел в команду — спавним его персонажа
Teams.OnPlayerJoinedTeam.Add(function(player){
    player.Spawns.Spawn();
});

// 5. АВТО-РЕСПАВН
Teams.OnPlayerDie.Add(function(player){
    // Ждем 3 секунды и возрождаем
    setTimeout(function(){
        player.Spawns.Spawn();
    }, 3000);
});
