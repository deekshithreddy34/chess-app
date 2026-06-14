import {
  isBoardFlippedAtom,
  movesAtom,
  userSelectedMoveIndexAtom,
} from '@repo/store/chessBoard';
import { Move } from 'chess.js';
import { useEffect, useRef } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  HandshakeIcon,
  FlagIcon,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface MovesTableProps {
  socket: WebSocket | null;
  gameId: string;
  started: boolean;
  drawOfferSent: boolean;
  onDrawOffer: () => void;
}

const MovesTable = ({ socket, gameId, started, drawOfferSent, onDrawOffer }: MovesTableProps) => {
  const [userSelectedMoveIndex, setUserSelectedMoveIndex] = useRecoilState(
    userSelectedMoveIndexAtom,
  );
  const setIsFlipped = useSetRecoilState(isBoardFlippedAtom);
  const moves = useRecoilValue(movesAtom);
  const movesTableRef = useRef<HTMLInputElement>(null);
  const movesArray = moves.reduce((result, _, index: number, array: Move[]) => {
    if (index % 2 === 0) {
      result.push(array.slice(index, index + 2));
    }
    return result;
  }, [] as Move[][]);

  useEffect(() => {
    if (movesTableRef && movesTableRef.current) {
      movesTableRef.current.scrollTo({
        top: movesTableRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [moves]);

  const handleResign = () => {
    socket?.send(JSON.stringify({
      type: 'resign_game',
      payload: { gameId },
    }));
  };

  const handleDrawOffer = () => {
    socket?.send(JSON.stringify({
      type: 'draw_offered',
      payload: { gameId },
    }));
    onDrawOffer();
  };

  return (
    <div className="text-[#C3C3C0] relative w-full ">
      <div
        className="text-sm h-[45vh] max-h-[45vh] overflow-y-auto"
        ref={movesTableRef}
      >
        {movesArray.map((movePairs, index) => {
          return (
            <div
              key={index}
              className={`w-full py-px px-4 font-bold items-stretch ${index % 2 !== 0 ? 'bg-[#2B2927]' : ''}`}
            >
              <div className="grid grid-cols-6 gap-16 w-4/5">
                <span className="text-[#C3C3C0] px-2 py-1.5">{`${index + 1}.`}</span>

                {movePairs.map((move, movePairIndex) => {
                  const isLastIndex =
                    movePairIndex === movePairs.length - 1 &&
                    movesArray.length - 1 === index;
                  const isHighlighted =
                    userSelectedMoveIndex !== null
                      ? userSelectedMoveIndex === index * 2 + movePairIndex
                      : isLastIndex;
                  const { san } = move;

                  return (
                    <div
                      key={movePairIndex}
                      className={`col-span-2 cursor-pointer flex items-center w-full pl-1 ${isHighlighted ? 'bg-[#484644] rounded border-b-[#5A5858] border-b-[3px]' : ''}`}
                      onClick={() => {
                        setUserSelectedMoveIndex(index * 2 + movePairIndex);
                      }}
                    >
                      <span className="text-[#C3C3C0]">{san}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {moves.length ? (
        <div className="w-full p-2 bg-[#20211D] flex items-center justify-between">
          {started && (
            <div className="flex gap-4">
              <AlertDialog>
                <AlertDialogTrigger
                  disabled={drawOfferSent}
                  className={`flex items-center gap-2 hover:bg-[#32302E] rounded px-2.5 py-1 ${drawOfferSent ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <HandshakeIcon size={16} />
                  {drawOfferSent ? 'Offered' : 'Draw'}
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-stone-800 border-stone-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white font-mono">Offer a draw?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white font-mono">
                      This will send a draw offer to your opponent.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-mono bg-[#739552] text-white font-semibold hover:bg-[#b2e084] hover:text-gray-700 border-none">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDrawOffer}
                      className="bg-[#e2e6aa] min-w-20 text-gray-900 hover:text-slate-100 hover:bg-[#bbc259] font-semibold"
                    >
                      Offer Draw
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger className="flex items-center gap-2 hover:bg-[#32302E] rounded px-2.5 py-1">
                  <FlagIcon size={16} />
                  Resign
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-stone-800 border-stone-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white font-mono">Resign the game?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white font-mono">
                      This action cannot be undone. You will lose the game.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-mono bg-[#739552] text-white font-semibold hover:bg-[#b2e084] hover:text-gray-700 border-none">
                      Continue Playing
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResign}
                      className="bg-red-600 min-w-20 text-white hover:bg-red-700 font-semibold"
                    >
                      Resign
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          <div className={`flex gap-1 ${started ? '' : 'ml-auto'}`}>
            <button
              onClick={() => {
                setUserSelectedMoveIndex(0);
              }}
              disabled={userSelectedMoveIndex === 0}
              className="hover:text-white"
              title="Go to first move"
            >
              <ChevronFirst />
            </button>

            <button
              onClick={() => {
                setUserSelectedMoveIndex((prev) =>
                  prev !== null ? prev - 1 : moves.length - 2,
                );
              }}
              disabled={userSelectedMoveIndex === 0}
              className="hover:text-white"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={() => {
                setUserSelectedMoveIndex((prev) =>
                  prev !== null
                    ? prev + 1 >= moves.length - 1
                      ? moves.length - 1
                      : prev + 1
                    : null,
                );
              }}
              disabled={userSelectedMoveIndex === null}
              className="hover:text-white"
            >
              <ChevronRight />
            </button>
            <button
              onClick={() => {
                setUserSelectedMoveIndex(moves.length - 1);
              }}
              disabled={userSelectedMoveIndex === null}
              className="hover:text-white"
              title="Go to last move"
            >
              <ChevronLast />
            </button>
            <button
              onClick={() => {
                setIsFlipped((prev) => !prev);
              }}
              title="Flip the board"
            >
              <RefreshCw className="hover:text-white mx-2" size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MovesTable;
