import { describe, expect, it } from "vitest";
import { ADJACENCY } from "./board";
import {
  applyAction,
  canFly,
  chooseAiMove,
  createInitialState,
  getPhase,
  legalActions,
  piecesOnBoard,
} from "./index";

describe("createInitialState", () => {
  it("starts with empty board and white to place", () => {
    const s = createInitialState();
    expect(s.board.every((c) => c === null)).toBe(true);
    expect(s.turn).toBe("white");
    expect(s.toPlace.white).toBe(9);
    expect(getPhase(s)).toBe("placing");
  });
});

describe("placing", () => {
  it("places a piece and switches turn", () => {
    const s0 = createInitialState();
    const r = applyAction(s0, { type: "place", point: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.board[0]).toBe("white");
    expect(r.state.toPlace.white).toBe(8);
    expect(r.state.turn).toBe("black");
  });

  it("rejects occupied point", () => {
    let s = createInitialState();
    const a = applyAction(s, { type: "place", point: 0 });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    s = a.state;
    const b = applyAction(s, { type: "place", point: 0 });
    expect(b.ok).toBe(false);
  });

  it("forms a mill and requires remove", () => {
    // White places 0,1 and will place 2 to complete mill [0,1,2]
    // Interleave black placements elsewhere
    let s = createInitialState();
    const places: number[] = [0, 9, 1, 21, 2]; // W0 B9 W1 B21 W2 → mill
    for (const p of places) {
      const r = applyAction(s, { type: "place", point: p });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      s = r.state;
    }
    expect(s.mustRemove).toBe(true);
    expect(getPhase(s)).toBe("removing");
    expect(s.turn).toBe("white");

    const rem = applyAction(s, { type: "remove", point: 9 });
    expect(rem.ok).toBe(true);
    if (!rem.ok) return;
    expect(rem.state.board[9]).toBe(null);
    expect(rem.state.captured.black).toBe(1);
    expect(rem.state.mustRemove).toBe(false);
    expect(rem.state.turn).toBe("black");
  });
});

describe("moving phase", () => {
  function placeAllHandlingMills(seq: number[]) {
    let s = createInitialState();
    for (const p of seq) {
      const r = applyAction(s, { type: "place", point: p });
      if (!r.ok) throw new Error(`place ${p}: ${r.error}`);
      s = r.state;
      while (s.mustRemove) {
        const removes = legalActions(s).filter((a) => a.type === "remove");
        const rr = applyAction(s, removes[0]);
        if (!rr.ok) throw new Error(rr.error);
        s = rr.state;
      }
    }
    return s;
  }

  it("reaches moving phase after 18 placements", () => {
    // Alternate places; removals allowed if mills form
    const seq = [
      0, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 1, 4,
    ];
    const s = placeAllHandlingMills(seq);
    expect(s.toPlace.white).toBe(0);
    expect(s.toPlace.black).toBe(0);
    expect(getPhase(s)).toBe("moving");
  });

  it("allows adjacent move only", () => {
    const seq = [
      0, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 10, 13,
    ];
    let s = placeAllHandlingMills(seq);
    expect(getPhase(s)).toBe("moving");

    // Find any legal move
    const moves = legalActions(s).filter((a) => a.type === "move");
    expect(moves.length).toBeGreaterThan(0);
    const good = applyAction(s, moves[0]);
    expect(good.ok).toBe(true);

    // Non-adjacent jump should fail when not flying
    const flyer = canFly(s, s.turn);
    if (!flyer) {
      const piece = s.board.findIndex((c) => c === s.turn);
      const occupiedOrFar = s.board
        .map((c, i) => i)
        .find(
          (i) =>
            s.board[i] === null &&
            !ADJACENCY[piece].includes(i),
        );
      if (occupiedOrFar !== undefined && piece >= 0) {
        const bad = applyAction(s, {
          type: "move",
          from: piece,
          to: occupiedOrFar,
        });
        expect(bad.ok).toBe(false);
      }
    }
  });
});

describe("win by pieces", () => {
  it("wins when opponent drops below 3 after remove", () => {
    let s = createInitialState();
    // Manually craft late game: set state with 3 black, white about to mill
    s = {
      ...s,
      board: Array(24).fill(null),
      toPlace: { white: 0, black: 0 },
      turn: "white",
      mustRemove: false,
      captured: { white: 0, black: 6 },
      winner: null,
      winReason: null,
    };
    s.board[0] = "white";
    s.board[1] = "white";
    s.board[4] = "white"; // will move 4→2? mill is 0,1,2 — place white at 2 via move
    s.board[9] = "black";
    s.board[14] = "black";
    s.board[21] = "black";
    // Move white 4 to 2 forms mill [0,1,2]
    // Is 4 adjacent to 2? No. 1 is adjacent to 2. Move from empty.
    // Move white from somewhere adjacent to 2: 1 is white. Use place phase...
    // Move piece that is adjacent: white at 1 can't move to 2 if 2 empty - 1 adjacent to 2.
    s.board[1] = null;
    s.board[2] = null;
    s.board[0] = "white";
    s.board[1] = "white";
    s.board[14] = "white"; // will move 14→2
    // 14 adjacent to 2? Yes.
    s.board[9] = "black";
    s.board[21] = "black";
    s.board[22] = "black";

    const r = applyAction(s, { type: "move", from: 14, to: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.mustRemove).toBe(true);

    const rem = applyAction(r.state, { type: "remove", point: 9 });
    expect(rem.ok).toBe(true);
    if (!rem.ok) return;
    expect(piecesOnBoard(rem.state, "black")).toBe(2);
    expect(rem.state.winner).toBe("white");
    expect(rem.state.winReason).toBe("pieces");
  });
});

describe("AI", () => {
  it("returns a legal action", () => {
    const s = createInitialState();
    const move = chooseAiMove(s, 2);
    expect(move).not.toBeNull();
    if (!move) return;
    const r = applyAction(s, move);
    expect(r.ok).toBe(true);
  });
});
