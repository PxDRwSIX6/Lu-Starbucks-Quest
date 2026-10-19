// ============================================================
//  CONFIGURAÇÃO — mexe aqui à vontade
// ============================================================
window.CONFIG = {
  // ---------- Textos ----------
  GAME_TITLE: "STARBUCKS QUEST",
  WIN_TITLE: "PARABÉNS!",
  // 👇 ESCREVE AQUI A TUA MENSAGEM (podes usar \n para mudar de linha)
  WIN_MESSAGE: "Parabéns! Amor não sabes o quanto eu gosto de ti! 💖\n\nAgora vai lá beber um starbucks  ☕ Luv U <3",

  // ---------- Objetivo ----------
  TOTAL_COFFEES: 20,

  // ============================================================
  //  PLAYER — TAMANHO E AJUSTES DO SPRITE
  // ============================================================
  PLAYER_FOLDER: "sprites/player/player2",  // pasta com back1..4, front1..4, left1..4, right1..4
  PLAYER_EXT: "png",

  SPRITE_SIZE: 64,       // ALTURA do boneco no jogo (px). Aumenta/diminui para o ajustar
  SPRITE_WIDTH: null,    // LARGURA (px). null = automática (mantém a proporção do sprite)
  FEET_OFFSET: 13,        // sobe/desce o sprite (se tiver espaço vazio por baixo dos pés, aumenta)
  SHADOW_SIZE: 14,       // largura da sombra debaixo do boneco

  HITBOX_W: 20,          // largura da caixa de colisão (árvores/água)
  HITBOX_H: 12,          // altura da caixa de colisão (a partir dos pés)
  PICKUP_RADIUS: 34,     // distância a que apanha um café

  WIN_SPRITE_SCALE: 4,   // tamanho do boneco na cena de parabéns (x SPRITE_SIZE)

  // ---------- Sprite do café ----------
  // Quando tiveres a imagem, mete-a aqui. Se não existir, desenha um copo verde.
  COFFEE_IMAGE: "sprites/items/starbucks.png",
  COFFEE_SIZE: 40,

  // ---------- Mundo ----------
  TILE: 48,
  MAP_W: 100,            // tamanho do mundo em tiles
  MAP_H: 75,
  SEED: null,            // põe um número para teres sempre o mesmo mundo (null = aleatório)

  // ---------- Movimento ----------
  SPEED: 150,            // px por segundo
  RUN_MULT: 1.7,         // multiplicador ao fazer sprint (Shift ou botão SPRINT)
  ANIM_FPS: 8,           // velocidade da animação de andar

  // ---------- Controlos de telemóvel ----------
  TOUCH_CONTROLS: "auto",   // "auto" = só em ecrãs táteis | true = sempre | false = nunca
  JOYSTICK_SIZE: 130,       // tamanho do joystick (px)
  SPRINT_BUTTON_SIZE: 84,   // tamanho do botão de sprint (px)

  // ---------- HUD ----------
  SHOW_MINIMAP: true,
  MINIMAP_SHOW_COFFEES: true,

  // ---------- Corações (cena final) ----------
  HEARTS_ENABLED: true,
  HEARTS_PER_PRESS: 14,     // quantos corações saem de cada vez que carregas
};
