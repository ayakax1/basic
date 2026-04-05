// библиотека для работы со стандартными длинами матчей

import { GameMode } from 'pixel_combats/room';

// константы
const PARAMETER_GAME_LENGTH = 'GameLength';

// возвращает длину матча (бесконечное время)
export function game_mode_length_seconds() {
    return Infinity; // или можно очень большое число, например 999999999
}
