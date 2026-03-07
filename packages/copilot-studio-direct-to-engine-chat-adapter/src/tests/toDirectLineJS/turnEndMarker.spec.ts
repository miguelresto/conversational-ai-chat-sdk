import { type TurnGenerator } from '../../createHalfDuplexChatAdapter';
import DeferredQueue from '../../private/DeferredQueue';
import { type JestMockOf } from '../../private/types/JestMockOf';
import toDirectLineJS from '../../toDirectLineJS';
import { type Activity } from '../../types/Activity';

const END_TURN = Symbol('END_TURN');

describe('with a TurnGenerator and emitTurnEndMarker: false', () => {
  let activityObserver: JestMockOf<(activity: Activity) => void>;
  let incomingActivityQueue: DeferredQueue<Activity | typeof END_TURN>;
  let turnGenerator: TurnGenerator;
  let nextTurn: JestMockOf<(activity?: Activity | undefined) => TurnGenerator>;

  beforeEach(() => {
    incomingActivityQueue = new DeferredQueue();

    nextTurn = jest.fn<TurnGenerator, [Activity | undefined]>(() => {
      return (async function* () {
        for (;;) {
          const activity = await incomingActivityQueue.promise;

          if (activity === END_TURN) {
            break;
          } else {
            yield activity;
          }
        }

        return nextTurn;
      })();
    });

    turnGenerator = nextTurn();

    activityObserver = jest.fn();

    const directLineJS = toDirectLineJS(turnGenerator, { emitTurnEndMarker: false });
    directLineJS.activity$.subscribe(activityObserver);
  });

  describe('when an activity arrives and the turn ends', () => {
    beforeEach(() => {
      incomingActivityQueue.push({ from: { id: 'bot' }, text: 'Hello, World!', type: 'message' });
      incomingActivityQueue.push(END_TURN);
    });

    describe('should call the activity observer', () => {
      test('once', () => expect(activityObserver).toHaveBeenCalledTimes(1));
      test('with the incoming activity', () =>
        expect(activityObserver).toHaveBeenNthCalledWith(1, {
          from: { id: 'bot' },
          text: 'Hello, World!',
          type: 'message'
        }));
    });
  });
});

describe('with a TurnGenerator and emitTurnEndMarker: true', () => {
  let activityObserver: JestMockOf<(activity: Activity) => void>;
  let incomingActivityQueue: DeferredQueue<Activity | typeof END_TURN>;
  let turnGenerator: TurnGenerator;
  let nextTurn: JestMockOf<(activity?: Activity | undefined) => TurnGenerator>;

  beforeEach(() => {
    incomingActivityQueue = new DeferredQueue();

    nextTurn = jest.fn<TurnGenerator, [Activity | undefined]>(() => {
      return (async function* () {
        for (;;) {
          const activity = await incomingActivityQueue.promise;

          if (activity === END_TURN) {
            break;
          } else {
            yield activity;
          }
        }

        return nextTurn;
      })();
    });

    turnGenerator = nextTurn();

    activityObserver = jest.fn();

    const directLineJS = toDirectLineJS(turnGenerator, { emitTurnEndMarker: true });
    directLineJS.activity$.subscribe(activityObserver);
  });

  describe('when an activity arrives and the turn ends', () => {
    beforeEach(() => {
      incomingActivityQueue.push({ from: { id: 'bot' }, text: 'Hello, World!', type: 'message' });
      incomingActivityQueue.push(END_TURN);
    });

    describe('should call the activity observer', () => {
      test('twice', () => expect(activityObserver).toHaveBeenCalledTimes(2));
      test('with the incoming activity', () =>
        expect(activityObserver).toHaveBeenNthCalledWith(1, {
          from: { id: 'bot' },
          text: 'Hello, World!',
          type: 'message'
        }));
      test('with the turn-end sentinel', () =>
        expect(activityObserver).toHaveBeenNthCalledWith(2, {
          channelData: { isTurnEndMarker: true },
          from: { id: 'bot', role: 'bot' },
          id: expect.any(String),
          name: 'copilot-studio:turn-end',
          type: 'event'
        }));
    });
  });
});
