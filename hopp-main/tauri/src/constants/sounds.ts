import { soundUtils } from "../lib/sound_utils";

export const sounds = {
  ringing: soundUtils.createPlayer("ring1"),
  unavailable: soundUtils.createPlayer("rejected"),
  callAccepted: soundUtils.createPlayer("bubble-pop"),
  callRejected: soundUtils.createPlayer("call-rejected"),
  incomingCall: soundUtils.createPlayer("incoming-call"),
};
