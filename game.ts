import prompt from 'prompt-sync';
import { v4 } from 'uuid';

const ask = prompt({ sigint: true })
const PLAYER_COUNT = 2;

class Game {
  deck: Deck;
  discard: Card[];
  players: Player[];
  currPlayerIdx: number;
  endGame: boolean; // indicates if someone has knocked
  endGamePlayerId: string | null;
  
  constructor() {
    this.deck = new Deck();
    this.discard = [this.deck.draw()];
    this.players = [
      new Player("Garrett", this.deck.drawHand()), 
      new Player("Kaleb", this.deck.drawHand())
    ];
    this.currPlayerIdx = 0;
    this.endGame = false;
    this.endGamePlayerId = null;
  }
  
  displayEndTurnOptions() {
    let choice: string;
    if (this.endGame) {
      choice = ask("Choice? (E)nd turn ");
    } else {
      choice = ask("Choice? (K)nock, (E)nd turn ");
      if (choice == "K") {
        this.signalEnd(this.currentPlayer().id);
        return;
      }
    }
    
    if (choice == "E") {
      return;
    } else {
      throw new Error(`Error: choice '${choice}' not recognized.`);
    }
  }

  signalEnd(endGamePlayerId: string) {
    this.endGame = true;
    this.endGamePlayerId = endGamePlayerId;
  }
  
  play() {
    this.takeTurn();
  }

  takeTurn() {
    while (true) {
      let gameFinished = this.endGame && this.currentPlayer().id == this.endGamePlayerId;
      if (gameFinished) {
        this.gameOver();
        break;
      } else {
        console.log('===========')
        console.log(`${this.currentPlayer().name}'s turn`);
        this.currentPlayer().takeTurn(this, this.deck, this.discard);
        this.cycleNextPlayer();
      }
    }
  }

  gameOver() {
    let lowestSum = this.players[0].hand.sum();
    let lowestSumPlayer = this.players[0];
    for (let player of this.players) {
      console.log(`${player.name}'s hand: ${player.hand.toString(false)}`);
      let sum = player.hand.sum()
      if (sum < lowestSum) {
        lowestSum = sum;
        lowestSumPlayer = player;
      }
    }
    console.log("Game finished!");
    console.log(`Winner: ${lowestSumPlayer.name}`);
  }

  currentPlayer(): Player {
    return this.players[this.currPlayerIdx];
  }

  cycleNextPlayer(): void {
    this.currPlayerIdx = (this.currPlayerIdx + 1) % PLAYER_COUNT;
  }
}

class Player {
  hand: Hand;
  id: string;
  name: string;

  constructor(name: string, hand: Hand) {
    this.hand = hand;
    this.id = v4();
    this.name = name;
  }

  takeTurn(game: Game, deck: Deck, discard: Card[]): void {
    // player draws from either deck or discard
    console.log(`Your hand is... ${this.hand.toString()}`);
    console.log(`Discard is: ${discard[discard.length - 1].value}`);
    let choice = ask("Draw from d(i)scard or d(e)ck?");
    let card: Card;
    if (choice == "i") {
      // we know .pop() will not be undefined because the discard is never empty. The discard always
      // has at least one card, since the game starts with 1 and replaced anytime it is taken. If
      // the discard is reshuffled into the deck, a card from the deck is placed as the new discard.
      card = discard.pop() as Card;
    } else if (choice == "e") {
      card = deck.draw();
    } else {
      throw new Error('Command not recognized.');
    }
    console.log(`Card drawn is... ${card.value}`);

    // player decides what to do with card (depends on type of card)
    if (card.suit == CardSuit.NUMBER) {
      // player gets option to swap card with one in their hand or discard
      let answer = ask("(S)wap or (D)iscard? ");
      if (answer == "S") {
        let ans = ask("Which card to swap? (0-3) ");
        this.hand.swap(parseInt(ans), card);
        console.log("Swapped! New hand:");
        console.log(this.hand.toString());
      } else if (answer == "D") {
        discard.push(card);
      } else {
        console.error(`Unknown option: '${answer}'`);
      }
    } else {
      console.error("Action cards not implemented.");
    }
    game.displayEndTurnOptions();
  }
}

class Card {
  value: number;
  suit: CardSuit;

  constructor(value: number, suit: CardSuit) {
    this.value = value;
    this.suit = suit;
  }

  action(hand: Hand): Hand {
    
    return hand;
  }
}

class Hand {
  cards: Card[];

  constructor(cards: Card[]) {
    this.cards = cards;
  }

  swap(idx: number, card: Card): Card {
    let toRemove = this.cards[idx]
    this.cards[idx] = card;
    return toRemove;
  }

  toString(hideMiddle = true): string {
    let hand = "";
    let hidden = hideMiddle ? [1, 2] : []; // indices of hidden cards
    for (let i = 0; i < 4; i++) {
      if (hidden.includes(i)) {
        hand += "[hidden] ";
      } else {
        hand += this.cards[i].value + " ";
      }
    }
    hand.trim();
    return hand;
  }

  sum(): number {
    let sum = 0;
    for (let card of this.cards) {
      sum += card.value;
    }
    return sum;
  }
}

class Deck {
  cards: Card[];

  constructor() {
    this.cards = this.getNewDeck();
  }

  /** initializes and returns a deck as per the specs in the rat-a-tat cat wikipedia article
   *  * 4 each of cards 1-8
   *  * 9 9's
   *  * 4 each of Peek, Swap (slightly changed from the article since not including draw 2)
   */ 
  getNewDeck(): Card[] {
    let cards: Card[] = [];

    // 4 each of values 1-8
    for (let j = 0; j < 4; j++) {
      for (let i = 1; i <= 8; i++) {
        cards.push(new Card(i, CardSuit.NUMBER));
      }
    }

    // 9 9's
    for (let i = 0; i < 9; i++) {
      cards.push(new Card(9, CardSuit.NUMBER));
    }

    // 4 each of Peek, Swap
    for (let suit of [CardSuit.PEEK, CardSuit.SWAP]) {
      for (let i = 0; i < 4; i++) {
        cards.push(new Card(10, suit));
      }
    }

    return cards;
  }

  draw(): Card {
    let removeIdx = Math.floor(Math.random() * this.cards.length);
    let card = this.cards.splice(removeIdx, 1)[0];
    return card;
  }

  /**
   * Draws and returns a hand of size 4.
   */
  drawHand(): Hand {
    let cards: Card[] = [];
    for (let i = 0; i < 4; i++) {
      cards.push(this.draw());
    }
    let hand = new Hand(cards);
    return hand;
  }
}

enum CardSuit {
  NUMBER,
  PEEK,
  SWAP
}

const game = new Game();
game.play();

// TODOS
// 1) Currently there is no concept of a discard pile... game auto-draws for you
// 2) Action cards need to be implemented