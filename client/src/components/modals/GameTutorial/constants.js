/**
 * Constants for the GameTutorialModal component
 */

/**
 * Tutorial steps data
 * Each step has a title, content, and optional image
 * @type {Array}
 */
export const TUTORIAL_STEPS = [
    {
      title: "Welcome to Warlock Party Game!",
      content: "In this game, players work together to defeat monsters while secret Warlocks try to corrupt the team.",
      image: null // Optional image URL
    },
    {
      title: "Your Abilities",
      content: "Each turn, choose one ability to use. Different classes have different abilities that unlock as you level up.",
      image: null
    },
    {
      title: "Monster Attack",
      content: "After all players act, the monster attacks a random player. The monster gets stronger each turn!",
      image: null
    },
    {
      title: "Warlocks",
      content: "One player starts as a Warlock. When Warlocks attack or are healed, they may convert other players to Warlocks.",
      image: null
    },
    {
      title: "Winning the Game",
      content: "Good players win by eliminating all Warlocks. Warlocks win by converting or killing all good players.",
      image: null
    }
  ];
  
  /**
   * Get a specific tutorial step
   * 
   * @param {number} index - Index of the step to retrieve
   * @returns {Object|null} Tutorial step or null if not found
   */
  export function getTutorialStep(index) {
    if (index >= 0 && index < TUTORIAL_STEPS.length) {
      return TUTORIAL_STEPS[index];
    }
    return null;
  }
