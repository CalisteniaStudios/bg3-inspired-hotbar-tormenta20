export const ACTION_GUIDE_URL = "https://referencet20.vercel.app/";

export const ACTION_GUIDE_CATEGORIES = Object.freeze([
  {
    id: "standard",
    label: "Padrão",
    icon: "fa-solid fa-burst",
    description: "A principal ação do seu turno.",
    actions: [
      { name: "Ataque à distância", summary: "Realize a ação Agredir com uma arma à distância.", icon: "fa-solid fa-bullseye" },
      { name: "Ataque corpo a corpo", summary: "Realize a ação Agredir com uma arma corpo a corpo.", icon: "fa-solid fa-khanda" },
      { name: "Atropelar", summary: "Passe pelo espaço ocupado por uma criatura.", icon: "fa-solid fa-person-running" },
      { name: "Fintar", summary: "Use Enganação para confundir uma criatura em combate.", icon: "fa-solid fa-masks-theater" },
      { name: "Lançar magia", summary: "Conjure uma magia cuja execução seja uma ação padrão.", icon: "fa-solid fa-wand-sparkles" },
      { name: "Manobra de combate", summary: "Troque um ataque corpo a corpo por uma manobra.", icon: "fa-solid fa-hand-fist", group: "Manobras" },
      { name: "Agarrar", summary: "Segure uma criatura com uma manobra de combate.", icon: "fa-solid fa-hands-holding", group: "Manobras" },
      { name: "Derrubar", summary: "Derrube uma criatura com uma manobra de combate.", icon: "fa-solid fa-person-falling", group: "Manobras" },
      { name: "Desarmar", summary: "Faça uma criatura derrubar um item que esteja segurando.", icon: "fa-solid fa-hand", group: "Manobras" },
      { name: "Empurrar", summary: "Afaste uma criatura com uma manobra de combate.", icon: "fa-solid fa-person-walking-arrow-right", group: "Manobras" },
      { name: "Quebrar", summary: "Ataque um objeto carregado por outra criatura.", icon: "fa-solid fa-hammer", group: "Manobras" },
      { name: "Preparar", summary: "Prepare uma ação para executá-la depois como reação.", icon: "fa-solid fa-clock" },
      { name: "Usar habilidade", summary: "Ative uma habilidade cuja execução seja uma ação padrão.", icon: "fa-solid fa-hand-sparkles" },
      { name: "Usar item mágico", summary: "Ative um item mágico que exija uma ação padrão.", icon: "fa-solid fa-flask" }
    ]
  },
  {
    id: "movement",
    label: "Movimento",
    icon: "fa-solid fa-person-walking",
    description: "Use para mudar sua posição ou manipular algo.",
    actions: [
      { name: "Levantar-se", summary: "Levante-se do chão, de uma cadeira ou de posição semelhante.", icon: "fa-solid fa-person-arrow-up-from-line" },
      { name: "Manipular item", summary: "Pegue, abra, entregue ou manipule um item ao alcance.", icon: "fa-solid fa-hand" },
      { name: "Mirar", summary: "Prepare um ataque à distância para obter seus benefícios.", icon: "fa-solid fa-crosshairs" },
      { name: "Movimentar-se", summary: "Ande, nade, voe ou escale até seu deslocamento.", icon: "fa-solid fa-person-walking" },
      { name: "Sacar ou guardar item", summary: "Saque ou guarde um item que esteja carregando.", icon: "fa-solid fa-box-open" },
      { name: "Vestir ou despir item", summary: "Vista ou remova um item que permita essa execução.", icon: "fa-solid fa-shirt" }
    ]
  },
  {
    id: "full",
    label: "Completa",
    icon: "fa-solid fa-hourglass",
    description: "Consome sua ação padrão e sua ação de movimento.",
    actions: [
      { name: "Corrida", summary: "Faça um teste de Atletismo para correr uma distância maior.", icon: "fa-solid fa-person-running" },
      { name: "Golpe de misericórdia", summary: "Ataque um oponente indefeso com grande vantagem.", icon: "fa-solid fa-skull" },
      { name: "Investida", summary: "Avance em linha reta e realize um ataque ao final.", icon: "fa-solid fa-person-running" },
      { name: "Lançar magia", summary: "Conjure uma magia cuja execução seja uma ação completa.", icon: "fa-solid fa-wand-sparkles" }
    ]
  },
  {
    id: "free",
    label: "Livre",
    icon: "fa-solid fa-feather",
    description: "Exige pouco tempo, mas normalmente só pode ser feita no seu turno.",
    actions: [
      { name: "Atrasar", summary: "Reduza sua iniciativa para agir mais tarde na rodada.", icon: "fa-solid fa-clock-rotate-left" },
      { name: "Falar", summary: "Diga uma frase curta ou comunique algo rapidamente.", icon: "fa-solid fa-comment" },
      { name: "Jogar-se no chão", summary: "Fique caído voluntariamente.", icon: "fa-solid fa-person-falling" },
      { name: "Largar item", summary: "Solte um item que esteja segurando.", icon: "fa-solid fa-hand" }
    ]
  }
]);

export function getActionGuideCategory(categoryId) {
  return ACTION_GUIDE_CATEGORIES.find((category) => category.id === categoryId) ?? ACTION_GUIDE_CATEGORIES[0];
}
