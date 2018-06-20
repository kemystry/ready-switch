import React from 'react';
import { init, isEnabled } from './utils';

let initialized = false;

export default class ReadySwitch extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      enabled: false,
    }
  }

  componentWillMount() {
    if (initialized) {
      this.updateEnabled();
    } else {
      init().then(() => {
        initialized = true;
        this.updateEnabled();
      });
    }
  }

  updateEnabled() {
    this.setState({
      enabled: isEnabled(this.props.switch),
    });
  }

  render() {
    if (!this.state.enabled) return null;
    return this.props.children;
  }
}
