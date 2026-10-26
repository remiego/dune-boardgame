import { useMemo, useState } from 'react';

type FactionId = 'baron' | 'bene-gesserit' | 'emperor' | 'fremen';
type Terrain = 'sand' | 'rock' | 'oasis' | 'city';
type TerritoryId =
  | 'arrakeen'
  | 'carthag'
  | 'sietch-tabr'
  | 'hagga-sietch'
  | 'imperial-basin'
  | 'the-dune-sea'
  | 'red-mountain'
  | 'the-sink';

interface Territory {
  id: TerritoryId;
  name: string;
  terrain: Terrain;
  spice: number;
  control: FactionId | null;
  troops: Record<FactionId, number>;
  neighbors: TerritoryId[];
}

interface PlayerState {
  faction: FactionId;
  spice: number;
  water: number;
  solari: number;
  troops: number;
  influence: number;
}

interface GameState {
  round: number;
  currentTurn: FactionId;
  winner: FactionId | null;
  territories: Record<TerritoryId, Territory>;
  players: Record<FactionId, PlayerState>;
  log: string[];
}

const factions: FactionId[] = ['baron', 'bene-gesserit', 'emperor', 'fremen'];
const order: FactionId[] = [...factions];

const territoryConfig: Array<Omit<Territory, 'troops'>> & { troops: Partial<Record<FactionId, number>> } = [
  {
    id: 'arrakeen',
    name: 'Arrakeen',
    terrain: 'city',
    spice: 4,
    control: 'emperor',
    neighbors: ['carthag', 'imperial-basin', 'the-dune-sea'],
    troops: { emperor: 3, baron: 1 },
  },
  {
    id: 'carthag',
    name: 'Carthag',
    terrain: 'rock',
    spice: 2,
    control: 'baron',
    neighbors: ['arrakeen', 'red-mountain', 'the-sink'],
    troops: { baron: 2 },
  },
  {
    id: 'sietch-tabr',
    name: 'Sietch Tabr',
    terrain: 'oasis',
    spice: 1,
    control: 'fremen',
    neighbors: ['hagga-sietch', 'the-dune-sea'],
    troops: { fremen: 3 },
  },
  {
    id: 'hagga-sietch',
    name: 'Hagga Sietch',
    terrain: 'oasis',
    spice: 2,
    control: null,
    neighbors: ['sietch-tabr', 'the-dune-sea', 'red-mountain'],
    troops: {},
  },
  {
    id: 'imperial-basin',
    name: 'Imperial Basin',
    terrain: 'sand',
    spice: 5,
    control: 'emperor',
    neighbors: ['arrakeen', 'the-dune-sea', 'the-sink'],
    troops: { emperor: 4 },
  },
  {
    id: 'the-dune-sea',
    name: 'The Dune Sea',
    terrain: 'sand',
    spice: 6,
    control: null,
    neighbors: ['arrakeen', 'sietch-tabr', 'hagga-sietch', 'imperial-basin', 'red-mountain'],
    troops: {},
  },
  {
    id: 'red-mountain',
    name: 'Red Mountain',
    terrain: 'rock',
    spice: 3,
    control: 'bene-gesserit',
    neighbors: ['carthag', 'hagga-sietch', 'the-dune-sea', 'the-sink'],
    troops: { 'bene-gesserit': 2 },
  },
  {
    id: 'the-sink',
    name: 'The Sink',
    terrain: 'sand',
    spice: 2,
    control: null,
    neighbors: ['carthag', 'imperial-basin', 'red-mountain'],
    troops: {},
  },
];

const emptyTroops: Record<FactionId, number> = {
  baron: 0,
  'bene-gesserit': 0,
  emperor: 0,
  fremen: 0,
};

function createInitialGameState(): GameState {
  const territories = territoryConfig.reduce<Record<TerritoryId, Territory>>((acc, territory) => {
    acc[territory.id] = {
      ...territory,
      troops: { ...emptyTroops, ...territory.troops },
    };
    return acc;
  }, {} as Record<TerritoryId, Territory>);

  return {
    round: 1,
    currentTurn: 'baron',
    winner: null,
    territories,
    players: {
      baron: { faction: 'baron', spice: 3, water: 2, solari: 4, troops: 8, influence: 1 },
      'bene-gesserit': { faction: 'bene-gesserit', spice: 2, water: 2, solari: 5, troops: 7, influence: 1 },
      emperor: { faction: 'emperor', spice: 3, water: 2, solari: 4, troops: 9, influence: 2 },
      fremen: { faction: 'fremen', spice: 2, water: 4, solari: 3, troops: 8, influence: 1 },
    },
    log: ['The spice wars begin.'],
  };
}

function getTerritoryControlCount(state: GameState, faction: FactionId) {
  return Object.values(state.territories).filter((territory) => territory.control === faction).length;
}

function updateWinner(state: GameState): GameState {
  const next = { ...state };

  for (const faction of factions) {
    const territoryCount = getTerritoryControlCount(next, faction);
    const spiceTotal = next.players[faction].spice;
    if (territoryCount >= 4 || spiceTotal >= 18) {
      next.winner = faction;
      next.log = [...next.log, `${faction} claims victory in the desert.`];
      return next;
    }
  }

  return next;
}

function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGameState());
  const [selectedId, setSelectedId] = useState<TerritoryId | null>('arrakeen');

  const selectedTerritory = selectedId ? game.territories[selectedId] : null;

  const visibleTerritories = useMemo(() => Object.values(game.territories), [game.territories]);

  const currentPlayer = game.players[game.currentTurn];

  const collectSpice = () => {
    if (game.winner) return;

    const next: GameState = structuredClone(game);
    const controlled = Object.values(next.territories).filter((territory) => territory.control === next.currentTurn);
    const bonus = controlled.reduce((sum, territory) => sum + territory.spice, 0);

    next.players[next.currentTurn].spice += bonus;
    next.log = [...next.log, `${next.currentTurn} collects ${bonus} spice.`];

    const resolved = updateWinner(next);
    setGame(resolved);
  };

  const reinforceSelected = () => {
    if (!selectedTerritory || game.winner) return;

    const territory = game.territories[selectedId!];
    if (territory.control !== game.currentTurn) {
      setGame({ ...game, log: [...game.log, 'You can only reinforce your own territory.'] });
      return;
    }

    const next: GameState = structuredClone(game);
    if (next.players[next.currentTurn].troops <= 0) {
      next.log = [...next.log, 'No troops available for reinforcement.'];
      setGame(next);
      return;
    }

    next.territories[selectedId!].troops[next.currentTurn] += 1;
    next.players[next.currentTurn].troops -= 1;
    next.log = [...next.log, `${next.currentTurn} reinforces ${territory.name}.`];
    setGame(updateWinner(next));
  };

  const advanceTurn = () => {
    if (game.winner) return;

    const currentIndex = order.indexOf(game.currentTurn);
    const nextFaction = order[(currentIndex + 1) % order.length];

    const nextState: GameState = {
      ...game,
      currentTurn: nextFaction,
      round: nextFaction === 'baron' ? game.round + 1 : game.round,
      log: [...game.log, `${nextFaction} takes the next turn.`],
    };

    setGame(nextState);
  };

  const attackSelected = () => {
    if (!selectedTerritory || game.winner) return;
    const currentFaction = game.currentTurn;
    const target = selectedTerritory;

    if (target.control === currentFaction) {
      setGame({ ...game, log: [...game.log, 'You cannot attack your own territory.'] });
      return;
    }

    const neighbors = Object.values(game.territories).filter(
      (territory) => territory.control !== currentFaction && territory.id !== target.id && target.neighbors.includes(territory.id),
    );

    const enemyNearby = neighbors.some((territory) => territory.id === target.id);
    if (!enemyNearby && target.control !== null) {
      setGame({ ...game, log: [...game.log, `${target.name} is not adjacent to a controlled territory.`] });
      return;
    }

    const next: GameState = structuredClone(game);
    const attackPower = next.players[currentFaction].influence + next.territories[selectedId!].troops[currentFaction];
    const defensePower = target.troops[target.control ?? currentFaction] + 2;

    if (attackPower > defensePower) {
      next.territories[selectedId!].control = currentFaction;
      next.territories[selectedId!].troops[currentFaction] += 1;
      next.territories[selectedId!].troops[target.control ?? currentFaction] = 0;
      next.players[currentFaction].spice += target.spice;
      next.log = [...next.log, `${currentFaction} captures ${target.name} and gains ${target.spice} spice.`];
    } else {
      next.log = [...next.log, `${currentFaction} attacks ${target.name} but fails.`];
    }

    setGame(updateWinner(next));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="title-panel">
          <p className="eyebrow">Dune strategy prototype</p>
          <h1>Imperium of Arrakis</h1>
        </div>

        <div className="turn-card">
          <span>Round</span>
          <strong>{game.round}</strong>
          <span>Current turn</span>
          <strong>{game.currentTurn}</strong>
        </div>

        <div className="faction-list">
          {factions.map((faction) => (
            <div key={faction} className={`faction-row ${game.currentTurn === faction ? 'active' : ''}`}>
              <span>{faction}</span>
              <b>{game.players[faction].spice} spice</b>
            </div>
          ))}
        </div>

        <div className="tools">
          <button onClick={collectSpice}>Collect spice</button>
          <button onClick={reinforceSelected}>Reinforce</button>
          <button onClick={attackSelected}>Attack</button>
          <button className="secondary" onClick={advanceTurn}>End turn</button>
        </div>

        <div className="player-panel">
          <h3>{currentPlayer.faction}</h3>
          <ul>
            <li>Spice: {currentPlayer.spice}</li>
            <li>Water: {currentPlayer.water}</li>
            <li>Solari: {currentPlayer.solari}</li>
            <li>Troops: {currentPlayer.troops}</li>
            <li>Influence: {currentPlayer.influence}</li>
          </ul>
        </div>
      </aside>

      <main className="board-panel">
        <div className="board-grid">
          {visibleTerritories.map((territory) => {
            const isSelected = selectedId === territory.id;
            const isControlled = territory.control === game.currentTurn;

            return (
              <button
                key={territory.id}
                className={`territory ${isSelected ? 'selected' : ''} ${isControlled ? 'controlled' : ''}`}
                onClick={() => setSelectedId(territory.id)}
                style={{
                  gridColumn: territory.id === 'arrakeen' ? '1 / span 2' : 'auto',
                  gridRow: territory.id === 'the-dune-sea' ? '2 / span 2' : 'auto',
                }}
              >
                <span className="territory-name">{territory.name}</span>
                <span className="territory-meta">{territory.terrain}</span>
                <span className="territory-meta">{territory.spice} spice</span>
                <span className="territory-meta">control: {territory.control ?? 'neutral'}</span>
                <span className="territory-meta">troops: {Object.values(territory.troops).reduce((sum, value) => sum + value, 0)}</span>
              </button>
            );
          })}
        </div>

        <div className="details-panel">
          <h3>{selectedTerritory?.name ?? 'Select a territory'}</h3>
          {selectedTerritory && (
            <>
              <p>Terrain: {selectedTerritory.terrain}</p>
              <p>Spice yield: {selectedTerritory.spice}</p>
              <p>Controlled by: {selectedTerritory.control ?? 'neutral'}</p>
              <div className="troop-breakdown">
                {factions.map((faction) => (
                  <span key={faction}>
                    {faction}: {selectedTerritory.troops[faction]}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="log-panel">
          <h3>War log</h3>
          <ul>
            {game.log.slice(-8).map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
