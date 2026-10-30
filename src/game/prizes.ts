import type { Prize } from '../types'

export const PRIZES: readonly Prize[] = [
  { id: 'deadlines', title: 'Набор для дедлайнов', emoji: '⏰', description: 'Календарь, в котором каждый день — на сутки длиннее' },
  { id: 'coffee', title: 'Вечный запас кофе', emoji: '☕', description: 'Кружка, которая никогда не пустеет (пока есть капсулы)' },
  { id: 'duck', title: 'Утка-отладчик', emoji: '🦆', description: 'Резиновый слушатель твоих багов' },
  { id: 'charger', title: 'Зарядка, что всегда рядом', emoji: '🔌', description: 'Кабель, который не теряется в рюкзаке' },
  { id: 'nap', title: 'Абонемент на пять минут сна', emoji: '😴', description: 'Действует на любой лекции в заднем ряду' },
  { id: 'pizza', title: 'Пицца в сессию', emoji: '🍕', description: 'Доставка прямо в читальный зал' },
  { id: 'cactus', title: 'Кактус-антистресс', emoji: '🌵', description: 'Колется, но слушает' },
  { id: 'socks', title: 'Носки с формулами', emoji: '🧦', description: 'Шпаргалка, которую не отберёт преподаватель' },
  { id: 'headphones', title: 'Наушники-невидимки', emoji: '🎧', description: 'Слышно только тебе, видно — никому' },
  { id: 'umbrella', title: 'Зонт от плохих новостей', emoji: '☂️', description: 'Спасает от внезапных пересдач' },
]

export const SUPER_PRIZE: Prize = {
  id: 'moon',
  title: 'Путёвка на Луну «до следующей сессии»',
  emoji: '🚀',
  description: 'Главный приз! Билет в один конец, зато с видом',
}

export const CONSOLATION_PRIZE: Prize = {
  id: 'sticker',
  title: 'Почётная наклейка «Почти угадал»',
  emoji: '🏅',
  description: 'Утешительный приз: выглядит лучше, чем звучит',
}
