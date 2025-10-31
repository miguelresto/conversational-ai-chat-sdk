import { scenario } from '@testduet/given-when-then';

import type { TurnGenerator } from '../../createHalfDuplexChatAdapter';
import DeferredQueue from '../../private/DeferredQueue';
import toDirectLineJS from '../../toDirectLineJS';
import type { Activity } from '../../types/Activity';

const END_TURN = Symbol('END_TURN');

scenario('sleep between iteration', bdd => {
  const setup = bdd.given('a TurnGenerator', async () => {
    const incomingActivityQueue = new DeferredQueue<Activity | typeof END_TURN>();

    const nextTurn: (activity?: Activity | undefined) => TurnGenerator = jest.fn<TurnGenerator, [Activity | undefined]>(
      () => {
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
      }
    );

    const turnGenerator = nextTurn();

    const activityObserver = jest.fn();
    const connectionStatusObserver = jest.fn();

    const directLineJS = toDirectLineJS(turnGenerator);

    directLineJS.connectionStatus$.subscribe(connectionStatusObserver);

    directLineJS.activity$.subscribe(activityObserver);

    return { activityObserver, connectionStatusObserver, directLineJS, incomingActivityQueue, nextTurn };
  });

  setup
    .when('receive the first activity', ({ incomingActivityQueue }) => {
      incomingActivityQueue.push({
        from: { id: 'bot', role: 'bot' },
        text: 'Hello, World!',
        type: 'message'
      });
    })
    .then('should receive one activity', ({ activityObserver }) => {
      expect(activityObserver).toHaveBeenCalledTimes(1);
    })
    .and('the first activity should match the snapshot', ({ activityObserver }) => {
      expect(activityObserver).toHaveBeenNthCalledWith(1, {
        from: { id: 'bot', role: 'bot' },
        text: 'Hello, World!',
        type: 'message'
      });
    })
    .when('receive the second activity', ({ incomingActivityQueue }) => {
      incomingActivityQueue.push({
        from: { id: 'bot', role: 'bot' },
        text: 'Aloha!',
        type: 'message'
      });
    })
    .then('should not receive the second activity immediately', ({ activityObserver }) => {
      // This test make sure we sleep between every activity.
      expect(activityObserver).toHaveBeenCalledTimes(1);
    })
    .when('sleep', () => new Promise(resolve => setTimeout(resolve, 0)))
    .then('should receive 2 activities', ({ activityObserver }) => {
      expect(activityObserver).toHaveBeenCalledTimes(2);
    })
    .and('the second activity should match the snapshot', ({ activityObserver }) => {
      expect(activityObserver).toHaveBeenNthCalledWith(2, {
        from: { id: 'bot', role: 'bot' },
        text: 'Aloha!',
        type: 'message'
      });
    });

  setup
    .when('receive first activity', ({ incomingActivityQueue }) => {
      incomingActivityQueue.push({
        from: { id: 'bot', role: 'bot' },
        text: 'Hello, World!',
        type: 'message'
      });
    })
    .then('should receive first activity', ({ activityObserver }) => {
      expect(activityObserver).toHaveBeenCalledTimes(1);
    })
    .when('post an activity and ended the turn', ({ directLineJS, incomingActivityQueue }) => {
      directLineJS
        .postActivity({
          from: { id: 'user', role: 'user' },
          text: 'Aloha!',
          type: 'message'
        })
        .subscribe(() => {});

      incomingActivityQueue.push(END_TURN);
    })
    .then('should post immediately', ({ nextTurn }) => {
      // This test make sure we call sleep between activities. Not after every activity.
      // We only need to sleep between every activities.

      // After one activity is received and the iteration is ended, it should post immediately.
      // This is because there should be no sleep after every activity, sleep are only in-between activities.
      expect(nextTurn).toHaveBeenCalledTimes(2);
    });
});
