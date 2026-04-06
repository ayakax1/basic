import { DisplayValueHeader } from 'pixel_combats/basic';
import * as room_lib from 'pixel_combats/room';
const { room, Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote, MapEditor } = room_lib;
import * as vote_types from 'pixel_combats/types/new_game_vote';
import * as teams from './default_teams.js'; // команды создаются здесь
import * as default_timer from './default_timer.js';
import * as damageScores from './damage_scores.js';
import * as mapScores from './map_scores.js';
import { addTeamScores } from './team_scores.js';

room.PopupsEnable = true;

// настройки
const WaitingPlayersTime = 10;
const TacticalPreparationTime = 30;
const OvertimeTime = 30;
const OvertimePauseTime = 3;
const MockModeTime = 10;
const EndOfMatchTime = 8;
const VoteTime = 10;

// бесконечное время основной битвы
mainTimer.Restart(9999999); // можно очень большое число вместо "настоящей" бесконечности

// очки
const WINNER_SCORES = 30;
const LOSER_SCORES = 15;
const TIMER_SCORES = 30;
const TIMER_SCORES_INTERVAL = 30;

// имена состояний
const WaitingStateValue = "Waiting";
const TacticalPreparationStateValue = "TacticalPreparation";
const GameStateValue = "Game";
const OvertimeStateValue = "Overtime";
const TieBreakerStateValue = "TieBreaker";
const MockModeStateValue = "MockMode";
const EndOfMatchStateValue = "EndOfMatch";

const immortalityTimerName = "immortality";
const KILLS_PROP_NAME = "Kills";
const SCORES_PROP_NAME = "Scores";

// получаем объекты режимов и таймеров
const mainTimer = Timers.GetContext().Get("Main");
const scores_timer = Timers.GetContext().Get("Scores");
const stateProp = Properties.GetContext().Get("State");

// параметры режима
Damage.GetContext().FriendlyFire.Value = GameMode.Parameters.GetBool("FriendlyFire");
const MapRotation = GameMode.Parameters.GetBool("MapRotation");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("OnlyPlayerBlocksDmg");
BreackGraph.PlayerBlockBoost = true;

Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = true;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;

// **Получаем команды из default_teams.js, они уже созданы там**
const blueTeam = Teams.Get("Blue") || teams.create_team_blue();
const redTeam = Teams.Get("Red") || teams.create_team_red();

// Назначаем блоки для строительства (если нужно)
blueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;
redTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

// Настраиваем лидерборды
LeaderBoard.PlayerLeaderBoardValues = [
    new DisplayValueHeader(KILLS_PROP_NAME, "Statistics/Kills", "Statistics/KillsShort"),
    new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
    new DisplayValueHeader("Spawns", "Statistics/Spawns", "Statistics/SpawnsShort"),
    new DisplayValueHeader(SCORES_PROP_NAME, "Statistics/Scores", "Statistics/ScoresShort")
];
LeaderBoard.TeamLeaderBoardValue = new DisplayValueHeader(SCORES_PROP_NAME, "Statistics\\Scores", "Statistics\\Scores");

LeaderBoard.TeamWeightGetter.Set(function (team) {
    return team.Properties.Get(SCORES_PROP_NAME).Value;
});
LeaderBoard.PlayersWeightGetter.Set(function (player) {
    return player.Properties.Get(SCORES_PROP_NAME).Value;
});

// Изначально обнуляем очки команд
redTeam.Properties.Get(SCORES_PROP_NAME).Value = 0;
blueTeam.Properties.Get(SCORES_PROP_NAME).Value = 0;

// UI: показываем очки команд вверху экрана
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: SCORES_PROP_NAME };
Ui.GetContext().TeamProp2.Value = { Team: "Red", Prop: SCORES_PROP_NAME };

// Обработчики смены команды и спавна
Teams.OnRequestJoinTeam.Add(function (player, team) { team.Add(player); });
Teams.OnPlayerChangeTeam.Add(function (player) { player.Spawns.Spawn(); });

// Бессмертие после респавна
Spawns.GetContext().OnSpawn.Add(function (player) {
    if (stateProp.Value == MockModeStateValue) {
        player.Properties.Immortality.Value = false;
        return;
    }
    player.Properties.Immortality.Value = true;
    player.Timers.Get(immortalityTimerName).Restart(3);
});
Timers.OnPlayerTimer.Add(function (timer) {
    if (timer.Id != immortalityTimerName) return;
    timer.Player.Properties.Immortality.Value = false;
});

// Спавн и смерти
Spawns.OnSpawn.Add(function (player) {
    if (stateProp.Value == MockModeStateValue) return;
    ++player.Properties.Spawns.Value;
});
Damage.OnDeath.Add(function (player) {
    if (stateProp.Value == MockModeStateValue) {
        Spawns.GetContext(player).Spawn();
        return;
    }
    ++player.Properties.Deaths.Value;
});

// Убийства
Damage.OnKillReport.Add(function (victim, killer, report) {
    if (stateProp.Value == MockModeStateValue) return;
    damageScores.applyKillReportScores(victim, killer, report);

    if (stateProp.Value === TieBreakerStateValue) {
        SetEndOfMatch_EndMode();
    }
});

// Редактирование карты
MapEditor.OnMapEdited.Add(function (player, details) {
    if (stateProp.Value == MockModeStateValue) return;
    mapScores.applyMapEditScores(player, details, blueTeam, redTeam);
});

// Таймер очков за время в игре
scores_timer.OnTimer.Add(function () {
    if (stateProp.Value !== GameStateValue) return;
    for (const player of Players.All) {
        if (player.Team == null) continue;
        player.Properties.Scores.Value += TIMER_SCORES;
        addTeamScores(player.Team, TIMER_SCORES);
    }
});

// Таймер смены состояний игры
mainTimer.OnTimer.Add(function () {
    switch (stateProp.Value) {
        case WaitingStateValue:
            SetTacticalPreparation();
            break;
        case TacticalPreparationStateValue:
            SetGameMode();
            break;
        case GameStateValue:
            CheckForOvertime();
            break;
        case OvertimeStateValue:
            SetEndOfMatch();
            break;
        case TieBreakerStateValue:
            // TieBreaker завершается при убийстве
            break;
        case MockModeStateValue:
            SetEndOfMatch_EndMode();
            break;
        case EndOfMatchStateValue:
            start_vote();
            break;
    }
});

// Начальное состояние
SetWaitingMode();

// Функции состояний (без изменений)
function SetWaitingMode() {
    stateProp.Value = WaitingStateValue;
    Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
    Spawns.GetContext().enable = false;
    mainTimer.Restart(WaitingPlayersTime);
}

function SetTacticalPreparation() {
    stateProp.Value = TacticalPreparationStateValue;
    Ui.GetContext().Hint.Value = "Hint/TacticalPrep";

    var inventory = Inventory.GetContext();
    inventory.Main.Value = false;
    inventory.Secondary.Value = false;
    inventory.Melee.Value = true;
    inventory.Explosive.Value = false;
    inventory.Build.Value = true;

    Damage.GetContext().DamageOut.Value = true;
    Spawns.GetContext().RespawnTime.Value = 2;

    mainTimer.Restart(TacticalPreparationTime);
    Spawns.GetContext().enable = true;

    SpawnTeams(); // спавним игроков команд
}

function SetGameMode() {
    Damage.GetContext().DamageOut.Value = true;
    stateProp.Value = GameStateValue;
    Ui.GetContext().Hint.Value = "Hint/MainBattle";

    var inventory = Inventory.GetContext();
    if (GameMode.Parameters.GetBool("OnlyKnives")) {
        inventory.Main.Value = false;
        inventory.Secondary.Value = false;
        inventory.Melee.Value = true;
        inventory.Explosive.Value = false;
        inventory.Build.Value = true;
    } else {
        inventory.Main.Value = true;
        inventory.Secondary.Value = true;
        inventory.Melee.Value = true;
        inventory.Explosive.Value = true;
        inventory.Build.Value = true;
    }

    mainTimer.Stop();

    Spawns.GetContext().Despawn();
    SpawnTeams();
}

function CheckForOvertime() {
    scores_timer.Stop();
    const leaderboard = LeaderBoard.GetTeams();
    const team1Score = leaderboard[0].Weight;
    const team2Score = leaderboard[1].Weight;

    const maxScore = Math.max(team1Score, team2Score);
    const minScore = Math.min(team1Score, team2Score);
    const difference = maxScore > 0 ? (maxScore - minScore) / maxScore : 0;

    if (difference <= 0.1) {
        SetOvertime();
    } else {
        SetEndOfMatch();
    }
}

function SetOvertime() {
    stateProp.Value = OvertimeStateValue;
    Ui.GetContext().Hint.Value = "Hint/Overtime";

    var inventory = Inventory.GetContext();
    inventory.MainInfinity.Value = true;
    inventory.SecondaryInfinity.Value = true;
    inventory.ExplosiveInfinity.Value = true;

    mainTimer.Restart(OvertimeTime);
}

function SetEndOfMatch() {
    scores_timer.Stop();
    const leaderboard = LeaderBoard.GetTeams();
    if (leaderboard[0].Weight !== leaderboard[1].Weight) {
        SetMockMode(leaderboard[0].Team, leaderboard[1].Team);

        for (const win_player of leaderboard[0].Team.Players) {
            win_player.Properties.Scores.Value += WINNER_SCORES;
        }
        for (const lose_player of leaderboard[1].Team.Players) {
            lose_player.Properties.Scores.Value += LOSER_SCORES;
        }
    } else {
        if (stateProp.Value === OvertimeStateValue) {
            stateProp.Value = TieBreakerStateValue;
            Ui.GetContext().Hint.Value = "Hint/TieBreaker";
        } else {
            SetEndOfMatch_EndMode();
        }
    }
}

function SetMockMode(winners, loosers) {
    stateProp.Value = MockModeStateValue;
    scores_timer.Stop();

    Ui.GetContext(winners).Hint.Value = "Hint/MockHintForWinners";
    Ui.GetContext(loosers).Hint.Value = "Hint/MockHintForLoosers";

    Damage.GetContext().DamageOut.Value = true;
    Spawns.GetContext().RespawnTime.Value = 2;

    var inventory = Inventory.GetContext(loosers);
    inventory.Main.Value = false;
    inventory.Secondary.Value = false;
    inventory.Melee.Value = false;
    inventory.Explosive.Value = false;
    inventory.Build.Value = false;

    inventory = Inventory.GetContext(winners);
    inventory.MainInfinity.Value = true;
    inventory.SecondaryInfinity.Value = true;
    inventory.ExplosiveInfinity.Value = true;
    inventory.BuildInfinity.Value = true;

    mainTimer.Restart(MockModeTime);
}

function SetEndOfMatch_EndMode() {
    stateProp.Value = EndOfMatchStateValue;
    scores_timer.Stop();
    Ui.GetContext().Hint.Value = "Hint/EndOfMatch";

    var spawns = Spawns.GetContext();
    spawns.enable = false;
    spawns.Despawn();

    Game.GameOver(LeaderBoard.GetTeams());
    mainTimer.Restart(EndOfMatchTime);
}

function OnVoteResult(v) {
    if (v.Result === null) return;
    NewGame.RestartGame(v.Result);
}
NewGameVote.OnResult.Add(OnVoteResult);

function start_vote() {
    var variants = [
        new vote_types.SameVariant(),
        new vote_types.OnlyUniqueVariants(true, false)
    ];

    if (MapRotation) variants.push(new vote_types.FromOfficialMapLists(3));

    NewGameVote.Start(variants, VoteTime);
}

function SpawnTeams() {
    for (const team of Teams) {
        Spawns.GetContext(team).Spawn();
    }
}

scores_timer.RestartLoop(TIMER_SCORES_INTERVAL);