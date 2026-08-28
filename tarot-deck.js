// tarot-deck.js
// Aurora Moon Tarot shared deck
// Used by server.js for daily tarot generation


const majorArcana = [
  ["🌀","The Fool","Beginnings • Trust • Leap","A new path opens when you stop demanding a perfect map.","Scatter stardust: take one gentle step toward the unknown."],
  ["🪄","The Magician","Will • Tools • Creation","You already hold more resources than you realize.","Scatter stardust: use what is in your hands before waiting for more."],
  ["🌙","The High Priestess","Intuition • Mystery • Inner Knowing","The quiet answer may be the truest one.","Scatter stardust: make space for your inner voice."],
  ["🌿","The Empress","Care • Creation • Nurture","What you tend with love can become a sanctuary.","Scatter stardust: nourish something living, including yourself."],
  ["🪐","The Emperor","Structure • Protection • Stability","Healthy structure can become a container for softness.","Scatter stardust: create one boundary that helps life flow."],
  ["🕯️","The Hierophant","Tradition • Teaching • Sacred Practice","Wisdom can be inherited, questioned, and remade.","Scatter stardust: honor a teaching while making it humane."],
  ["💞","The Lovers","Choice • Alignment • Devotion","Love is also the courage to choose in alignment with truth.","Scatter stardust: choose what reflects your values."],
  ["🚀","The Chariot","Direction • Focus • Momentum","Your movement matters, even when the road is uneven.","Scatter stardust: choose your direction and take the next step."],
  ["🦁","Strength","Compassion • Courage • Soft Power","Your softness is not the opposite of strength. It is part of it.","Scatter stardust: meet one hard thing with gentleness."],
  ["🔦","The Hermit","Solitude • Wisdom • Inner Light","A quiet season can still be deeply productive.","Scatter stardust: protect a pocket of sacred solitude."],
  ["🎡","Wheel of Fortune","Cycles • Change • Turning Point","The wheel turns. You are allowed to turn with it.","Scatter stardust: release the need to control every outcome."],
  ["⚖️","Justice","Truth • Accountability • Balance","Clarity asks for both honesty and responsibility.","Scatter stardust: make one choice that restores balance."],
  ["🕸️","The Hanged One","Pause • Surrender • New View","A pause is not failure. It may be the doorway to perspective.","Scatter stardust: stop forcing and look again."],
  ["🦋","Death","Ending • Release • Transformation","Something can end without meaning you failed.","Scatter stardust: let one old version of yourself rest."],
  ["🌈","Temperance","Integration • Healing • Flow","Healing may arrive through small adjustments, not dramatic extremes.","Scatter stardust: blend patience with action."],
  ["⛓️","The Devil","Attachment • Shadow • Liberation","Naming the pattern is the beginning of loosening it.","Scatter stardust: notice what drains your freedom."],
  ["⚡","The Tower","Disruption • Truth • Liberation","What falls may have been too small to hold your becoming.","Scatter stardust: protect what is real while the false breaks away."],
  ["⭐","The Star","Hope • Renewal • Blessing","Hope returns like starlight: quiet, distant, and still real.","Scatter stardust: offer hope without denying pain."],
  ["🌕","The Moon","Dreams • Fear • Intuition","Not all shadows are warnings. Some are invitations inward.","Scatter stardust: listen to what your dreams are trying to soften."],
  ["☀️","The Sun","Joy • Clarity • Vitality","Joy is medicine, not a distraction from the work.","Scatter stardust: let one honest delight take up space."],
  ["📣","Judgement","Awakening • Calling • Renewal","A deeper call is rising through you. You do not have to ignore it.","Scatter stardust: answer one truth you have been avoiding."],
  ["🌍","The World","Completion • Wholeness • Arrival","You have crossed more thresholds than you remember.","Scatter stardust: celebrate one cycle you survived or completed."]
];


const suitData = {
  Wands: {
    symbol:"🔥",
    theme:"Spark • Purpose • Creative Fire",
    element:"fire",
    action:"Scatter stardust: move one spark from idea into action."
  },

  Cups: {
    symbol:"💧",
    theme:"Heart • Feeling • Connection",
    element:"water",
    action:"Scatter stardust: respond with emotional honesty and care."
  },

  Swords: {
    symbol:"🗡️",
    theme:"Mind • Truth • Clarity",
    element:"air",
    action:"Scatter stardust: speak clearly without using truth as a weapon."
  },

  Pentacles: {
    symbol:"🌿",
    theme:"Body • Resources • Daily Life",
    element:"earth",
    action:"Scatter stardust: care for the practical thing right in front of you."
  }
};


const rankMeanings = {
  Ace:["Seed","A new beginning is glowing. Protect the spark before demanding the harvest."],
  Two:["Choice","Two paths are asking for your attention. Choose with your whole self, not only your fear."],
  Three:["Growth","Something is beginning to take shape through collaboration, practice, or patience."],
  Four:["Foundation","Stability is asking to be tended. What supports you deserves care too."],
  Five:["Challenge","Tension is present, but it is not the whole story. Let friction reveal what needs healing."],
  Six:["Return","Support, memory, and restoration are available. Let care move both ways."],
  Seven:["Discernment","Not every option deserves your energy. Choose what is aligned, not merely loud."],
  Eight:["Momentum","Progress is happening. Stay present with the rhythm instead of rushing the result."],
  Nine:["Threshold","You are close to a meaningful shift. Honor the effort it took to get here."],
  Ten:["Completion","A cycle is heavy, full, or ready to transform. You may put some of it down."],
  Page:["Message","Beginner energy is sacred. Let curiosity open the door."],
  Knight:["Movement","Energy is moving quickly. Aim it with intention."],
  Queen:["Embodiment","This card asks you to lead through presence, care, and inner authority."],
  King:["Mastery","Power is most sacred when it protects, steadies, and serves."]
};


function buildMinorArcana(){

  const ranks = Object.keys(rankMeanings);
  const cards = [];

  for (const suit in suitData){

    ranks.forEach(rank => {

      const data = suitData[suit];
      const meaning = rankMeanings[rank];

      cards.push([
        data.symbol,
        `${rank} of ${suit}`,
        `${meaning[0]} • ${data.theme}`,
        `${meaning[1]} In the realm of ${suit.toLowerCase()}, your ${data.element} medicine is asking to be honored.`,
        data.action
      ]);

    });

  }

  return cards;
}


const tarotDeck = [
  ...majorArcana,
  ...buildMinorArcana()
].map(card => ({
  symbol: card[0],
  title: card[1],
  keyword: card[2],
  message: card[3],
  action: card[4]
}));


module.exports = tarotDeck;