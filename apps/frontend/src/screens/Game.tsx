/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react';
import MoveSound from '/move.wav';
import { Button } from '../components/Button';
import { ChessBoard, isPromoting } from '../components/ChessBoard';
import { useSocket } from '../hooks/useSocket';
import { Chess, Move } from 'chess.js';
import { useNavigate, useParams } from 'react-router-dom';
import MovesTable from '../components/MovesTable';
import { useUser } from '@repo/store/useUser';
import { UserAvatar } from '../components/UserAvatar';

// TODO: Move together, there's code repetition here
export const INIT_GAME = 'init_game';
export const MOVE = 'move';
export const OPPONENT_DISCONNECTED = 'opponent_disconnected';
export const GAME_OVER = 'game_over';
export const JOIN_ROOM = 'join_room';
export const GAME_JOINED = 'game_joined';
export const GAME_ALERT = 'game_alert';
export const GAME_ADDED = 'game_added';
export const USER_TIMEOUT = 'user_timeout';
export const GAME_TIME = 'game_time';
export const GAME_ENDED = 'game_ended';
export const EXIT_GAME = 'exit_game';
export const RESIGN_GAME = 'resign_game';
export const DRAW_OFFERED = 'draw_offered';
export const DRAW_ACCEPTED = 'draw_accepted';
export const DRAW_DECLINED = 'draw_declined';
export enum Result {
  WHITE_WINS = 'WHITE_WINS',
  BLACK_WINS = 'BLACK_WINS',
  DRAW = 'DRAW',
}
export interface GameResult {
  result: Result;
  by: string;
}

const GAME_TIME_MS = 10 * 60 * 1000;

export interface Player {
  id: string;
  name: string;
  isGuest: boolean;
}
import { useRecoilValue, useSetRecoilState } from 'recoil';

import { movesAtom, userSelectedMoveIndexAtom } from '@repo/store/chessBoard';
import GameEndModal from '@/components/GameEndModal';
import { Waitopponent } from '@/components/ui/waitopponent';
import { ShareGame } from '../components/ShareGame';
import ExitGameModel from '@/components/ExitGameModel';

const moveAudio = new Audio(MoveSound);

export interface Metadata {
  blackPlayer: Player;
  whitePlayer: Player;
}

export const Game = () => {
  const socket = useSocket();
  const { gameId } = useParams();
  const user = useUser();

  const navigate = useNavigate();
  // Todo move to store/context
  const [chess, _setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [added, setAdded] = useState(false);
  const [started, setStarted] = useState(false);
  const [gameMetadata, setGameMetadata] = useState<Metadata | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [player1TimeConsumed, setPlayer1TimeConsumed] = useState(0);
  const [player2TimeConsumed, setPlayer2TimeConsumed] = useState(0);
  const [gameID,setGameID] = useState("");
  const [drawOfferSent, setDrawOfferSent] = useState(false);
  const [drawOfferedByOpponent, setDrawOfferedByOpponent] = useState(false);
  const setMoves = useSetRecoilState(movesAtom);
  const userSelectedMoveIndex = useRecoilValue(userSelectedMoveIndexAtom);
  const userSelectedMoveIndexRef = useRef(userSelectedMoveIndex);

  useEffect(() => {
    userSelectedMoveIndexRef.current = userSelectedMoveIndex;
  }, [userSelectedMoveIndex]);

  useEffect(() => {
    if (!user) {
      navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user]);

  useEffect(() => {
    if (!socket) {
      return;
    }
    socket.onmessage = function (event) {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case GAME_ADDED:
          setAdded(true);
          setGameID(()=>message.gameId);
          break;
        case INIT_GAME:
          setBoard(chess.board());
          setStarted(true);
          navigate(`/game/${message.payload.gameId}`);
          setGameMetadata({
            blackPlayer: message.payload.blackPlayer,
            whitePlayer: message.payload.whitePlayer,
          });
          break;
        case MOVE:
          const { move, player1TimeConsumed, player2TimeConsumed } =
            message.payload;
          setPlayer1TimeConsumed(player1TimeConsumed);
          setPlayer2TimeConsumed(player2TimeConsumed);
          if (userSelectedMoveIndexRef.current !== null) {
            setMoves((moves) => [...moves, move]);
            return;
          }
          try {
            if (isPromoting(chess, move.from, move.to)) {
              chess.move({
                from: move.from,
                to: move.to,
                promotion: 'q',
              });
            } else {
              chess.move({ from: move.from, to: move.to });
            }
            setMoves((moves) => [...moves, move]);
            moveAudio.play();
          } catch (error) {
            console.log('Error', error);
          }
          break;
        case GAME_OVER:
          setResult(message.payload.result);
          break;

        case GAME_ENDED:
          let wonBy;
          if (message.payload.wonBy) {
            wonBy = message.payload.wonBy;
          } else {
            switch (message.payload.status) {
              case 'COMPLETED':
                wonBy = message.payload.result !== 'DRAW' ? 'CheckMate' : 'Draw';
                break;
              case 'PLAYER_EXIT':
                wonBy = 'Player Exit';
                break;
              default:
                wonBy = 'Timeout';
            }
          }
          setResult({
            result: message.payload.result,
            by: wonBy,
          });
          setDrawOfferSent(false);
          setDrawOfferedByOpponent(false);
          chess.reset();
          setStarted(false);
          setAdded(false);

          break;

        case DRAW_OFFERED:
          if (message.payload.offeredBy !== user?.id) {
            setDrawOfferedByOpponent(true);
          }
          break;

        case DRAW_DECLINED:
          setDrawOfferSent(false);
          break;

        case USER_TIMEOUT:
          setResult(message.payload.win);
          break;

        case GAME_JOINED:
          setGameMetadata({
            blackPlayer: message.payload.blackPlayer,
            whitePlayer: message.payload.whitePlayer,
          });
          setPlayer1TimeConsumed(message.payload.player1TimeConsumed);
          setPlayer2TimeConsumed(message.payload.player2TimeConsumed);
          console.error(message.payload);
          setStarted(true);

          message.payload.moves.map((x: Move) => {
            if (isPromoting(chess, x.from, x.to)) {
              chess.move({ ...x, promotion: 'q' });
            } else {
              chess.move(x);
            }
          });
          setMoves(message.payload.moves);
          break;

        case GAME_TIME:
          setPlayer1TimeConsumed(message.payload.player1Time);
          setPlayer2TimeConsumed(message.payload.player2Time);
          break;

        default:
          alert(message.payload.message);
          break;
      }
    };

    if (gameId !== 'random') {
      socket.send(
        JSON.stringify({
          type: JOIN_ROOM,
          payload: {
            gameId,
          },
        }),
      );
    }
  }, [chess, socket]);

  useEffect(() => {
    if (started) {
      const interval = setInterval(() => {
        if (chess.turn() === 'w') {
          setPlayer1TimeConsumed((p) => p + 100);
        } else {
          setPlayer2TimeConsumed((p) => p + 100);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [started, gameMetadata, user]);

  const getTimer = (timeConsumed: number) => {
    const timeLeftMs = GAME_TIME_MS - timeConsumed;
    const minutes = Math.floor(timeLeftMs / (1000 * 60));
    const remainingSeconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

    return (
      <div className="text-white">
        Time Left: {minutes < 10 ? '0' : ''}
        {minutes}:{remainingSeconds < 10 ? '0' : ''}
        {remainingSeconds}
      </div>
    );
  };

  const handleExit = () => {
    socket?.send(
      JSON.stringify({
        type: EXIT_GAME,
        payload: {
          gameId,
        },
      }),
    );
    setMoves([]);
    navigate('/');
  };

  const handleAcceptDraw = () => {
    socket?.send(
      JSON.stringify({
        type: DRAW_ACCEPTED,
        payload: { gameId },
      }),
    );
    setDrawOfferedByOpponent(false);
  };

  const handleDeclineDraw = () => {
    socket?.send(
      JSON.stringify({
        type: DRAW_DECLINED,
        payload: { gameId },
      }),
    );
    setDrawOfferedByOpponent(false);
  };

  if (!socket) return <div>Connecting...</div>;

  return (
    <div className="">
      {result && (
        <GameEndModal
          blackPlayer={gameMetadata?.blackPlayer}
          whitePlayer={gameMetadata?.whitePlayer}
          gameResult={result}
        ></GameEndModal>
      )}
      {drawOfferedByOpponent && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
          <div className="relative bg-gray-800 rounded-lg shadow-lg p-8 w-80 flex flex-col items-center gap-6">
            <h2 className="text-white text-xl font-bold font-mono">Draw Offered</h2>
            <p className="text-gray-300 text-center font-mono">Your opponent is offering a draw. Do you accept?</p>
            <div className="flex gap-4 w-full">
              <button
                onClick={handleAcceptDraw}
                className="flex-1 py-2 bg-[#e2e6aa] text-gray-900 font-semibold rounded hover:bg-[#bbc259]"
              >
                Accept
              </button>
              <button
                onClick={handleDeclineDraw}
                className="flex-1 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      {started && (
        <div className="justify-center flex pt-4 text-white">
          {(user.id === gameMetadata?.blackPlayer?.id ? 'b' : 'w') ===
          chess.turn()
            ? 'Your turn'
            : "Opponent's turn"}
        </div>
      )}
      <div className="justify-center flex">
        <div className="pt-2 w-full">
          <div className="flex gap-8 w-full">
            <div className="text-white">
              <div className="flex justify-center">
                <div>
                  {started && (
                    <div className="mb-4">
                      <div className="flex justify-between">
                        <UserAvatar gameMetadata={gameMetadata} />
                        {getTimer(
                          user.id === gameMetadata?.whitePlayer?.id
                            ? player2TimeConsumed
                            : player1TimeConsumed,
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className={`w-full flex justify-center text-white`}>
                      <ChessBoard
                        started={started}
                        gameId={gameId ?? ''}
                        myColor={
                          user.id === gameMetadata?.blackPlayer?.id ? 'b' : 'w'
                        }
                        chess={chess}
                        setBoard={setBoard}
                        socket={socket}
                        board={board}
                      />
                    </div>
                  </div>
                  {started && (
                    <div className="mt-4 flex justify-between">
                      <UserAvatar gameMetadata={gameMetadata} self />
                      {getTimer(
                        user.id === gameMetadata?.blackPlayer?.id
                          ? player2TimeConsumed
                          : player1TimeConsumed,
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-md pt-2 bg-bgAuxiliary3 flex-1 overflow-auto h-[95vh] overflow-y-scroll no-scrollbar">
              {!started ? (
                <div className="pt-8 flex justify-center w-full">
                  {added ? (
                    <div className='flex flex-col items-center space-y-4 justify-center'>
                      <div className="text-white"><Waitopponent/></div>
                      <ShareGame gameId={gameID}/>
                    </div>
                  ) : (
                    gameId === 'random' && (
                      <Button
                        onClick={() => {
                          socket.send(
                            JSON.stringify({
                              type: INIT_GAME,
                            }),
                          );
                        }}
                      >
                        Play
                      </Button>
                    )
                  )}
                </div>
              ) : (
                <div className="p-8 flex justify-center w-full">
                  <ExitGameModel onClick={() => handleExit()} />
                </div>
              )}
              <div>
                <MovesTable
                  socket={socket}
                  gameId={gameId ?? ''}
                  started={started}
                  drawOfferSent={drawOfferSent}
                  onDrawOffer={() => setDrawOfferSent(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

