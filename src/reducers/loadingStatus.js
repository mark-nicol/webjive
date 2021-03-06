import {
  FETCH_DEVICE_NAMES,
  FETCH_DEVICE_NAMES_SUCCESS,
  FETCH_DEVICE,
  FETCH_DEVICE_SUCCESS,
  EXECUTE_COMMAND,
  EXECUTE_COMMAND_COMPLETE
} from '../actions/actionTypes';

export default function loadingStatus(
  state = {
    loadingNames: false,
    loadingDevice: false,
    loadingOutput: {}
  },
  action
) {
  switch (action.type) {
    case FETCH_DEVICE_NAMES:
      return { ...state, loadingNames: true };

    case FETCH_DEVICE_NAMES_SUCCESS:
      return { ...state, loadingNames: false };

    case FETCH_DEVICE:
      return { ...state, loadingDevice: true };

    case FETCH_DEVICE_SUCCESS:
      return { ...state, loadingDevice: false };

    case EXECUTE_COMMAND: {
      const oldLoadingOutput = state.loadingOutput;
      const { command, device } = action;
      const deviceResults = { ...oldLoadingOutput[device], [command]: true };
      const loadingOutput = { ...oldLoadingOutput, [device]: deviceResults };
      return { ...state, loadingOutput };
    }

    case EXECUTE_COMMAND_COMPLETE: {
      const { command, device } = action;
      const oldLoadingOutput = state.loadingOutput;
      const deviceLoading = { ...oldLoadingOutput[device], [command]: false };
      const loadingOutput = { ...oldLoadingOutput, [device]: deviceLoading };
      return { ...state, loadingOutput };
    }

    default:
      return state;
  }
}
