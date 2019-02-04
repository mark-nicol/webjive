import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import queryString from 'query-string';

import EditCanvas from './EditCanvas/EditCanvas';
import Library from './Library/Library';
import RunCanvas from './RunCanvas/RunCanvas';
import Inspector from './Inspector/Inspector';

import { WIDGET_DEFINITIONS, normalizeWidgetDefinitions } from './widgets/widgetDefinitions';

import { complexWidgetDefinition } from './ComplexWidget/ComplexWidget';

import './Dashboard.css';

const GRID_TILE_SIZE = 15;

const DEFAULT_CANVASES = [
  {
    id: 0,
    name: 'Root',
    widgets: []
  },
  {
    id: 1,
    name: 'Subcanvas 1',
    widgets: []
  },
  {
    id: 2,
    name: 'Subcanvas 2',
    widgets: []
  },
  {
    id: 3,
    name: 'Subcanvas 3',
    widgets: []
  }
];

export function roundToGrid(val) {
  return val % GRID_TILE_SIZE >= GRID_TILE_SIZE / 2
    ? val + (GRID_TILE_SIZE - (val % GRID_TILE_SIZE))
    : val - (val % GRID_TILE_SIZE);
}

export function expandToGrid(val) {
  return val + (GRID_TILE_SIZE - (val % GRID_TILE_SIZE));
}

class Dashboard extends Component {
  constructor(props) {
    super(props);
    const { location } = props;
    const { c } = queryString.parse(location.search);
    const canvases = c ? JSON.parse(decodeURI(c)) : DEFAULT_CANVASES;

    this.state = {
      mode: 'edit',
      sidebar: 'library', // Belongs in edit component
      selectedWidgetIndex: -1, // Belongs in edit component
      selectedCanvasIndex: 0,
      canvases,
      deviceNames: [] // Not used?
    };

    this.toggleMode = this.toggleMode.bind(this);
    this.handleMoveWidget = this.handleMoveWidget.bind(this);
    this.handleAddWidget = this.handleAddWidget.bind(this);
    this.handleSelectWidget = this.handleSelectWidget.bind(this);
    this.handleDeleteWidget = this.handleDeleteWidget.bind(this);
    this.handleParamChange = this.handleParamChange.bind(this);
    this.handleDeviceChange = this.handleDeviceChange.bind(this);
    this.handleAttributeChange = this.handleAttributeChange.bind(this);
    this.handleChangeCanvas = this.handleChangeCanvas.bind(this);
  }

  toggleMode() {
    let { mode } = this.state;
    mode = { edit: 'run', run: 'edit' }[mode];
    this.setState({ mode });
  }

  handleSelectWidget(index) {
    this.setState({ selectedWidgetIndex: index });
  }

  handleDeleteWidget(index) {
    const widgets = [...this.currentWidgets()];
    widgets.splice(index, 1);
    this.updateWidgets(widgets, -1);
  }

  handleAddWidget(definition, x, y) {
    const params = definition.params.reduce(
      (accum, param) => ({
        ...accum,
        [param.name]: param.default
      }),
      {}
    );

    const device = this.isRootCanvas() ? null : '__parent__';
    const widget = {
      type: definition.type,
      device,
      x: roundToGrid(x),
      y: roundToGrid(y),
      attribute: null,
      params
    };
    const widgets = [...this.currentWidgets(), widget];
    this.updateWidgets(widgets, widgets.length - 1);
  }

  handleParamChange(param, value) {
    const { selectedWidgetIndex } = this.state;
    const widget = this.selectedWidget();

    const params = { ...widget.params, [param]: value };
    const updatedWidget = { ...widget, params };
    const widgets = this.currentWidgets();
    widgets.splice(selectedWidgetIndex, 1, updatedWidget);
    this.updateWidgets(widgets);
  }

  updateWidgets(widgets, widgetIndex) {
    const { history } = this.props;
    const { selectedCanvasIndex } = this.state;
    let { canvases, selectedWidgetIndex } = this.state;
    selectedWidgetIndex = widgetIndex != null ? widgetIndex : selectedWidgetIndex;
    canvases = [...canvases];
    const canvas = { ...canvases[selectedCanvasIndex], widgets };
    canvases[selectedCanvasIndex] = canvas;
    this.setState({ canvases, selectedWidgetIndex });
    const c = encodeURI(JSON.stringify(canvases));
    history.replace(`?c=${c}`);
  }

  // Convenience method used by handler methods
  updateWidget(index, changes) {
    const widgets = this.currentWidgets();
    const widget = { ...widgets[index], ...changes };
    widgets.splice(index, 1, widget);
    this.updateWidgets(widgets);
  }

  currentWidgets() {
    const { canvases, selectedCanvasIndex } = this.state;
    const canvas = canvases[selectedCanvasIndex];
    return [...canvas.widgets];
  }

  selectedWidget() {
    const { selectedWidgetIndex } = this.state;
    const widgets = this.currentWidgets();
    return widgets[selectedWidgetIndex];
  }

  handleMoveWidget(index, x, y) {
    const widget = this.currentWidgets()[index];
    const proposedPos = { x: widget.x + x, y: widget.y + y };
    const newPos = {
      x: Math.max(0, roundToGrid(proposedPos.x)),
      y: Math.max(0, roundToGrid(proposedPos.y))
    };
    this.updateWidget(index, newPos);
  }

  handleDeviceChange(device) {
    const { selectedWidgetIndex } = this.state;
    this.updateWidget(selectedWidgetIndex, { device });
  }

  handleAttributeChange(attribute) {
    const { selectedWidgetIndex } = this.state;
    this.updateWidget(selectedWidgetIndex, { attribute });
  }

  handleChangeCanvas(event) {
    const selectedCanvasIndex = parseInt(event.target.value, 10);
    this.setState({ selectedCanvasIndex });
  }

  isRootCanvas() {
    const { selectedCanvasIndex } = this.state;
    return selectedCanvasIndex === 0;
  }

  render() {
    const { canvases, deviceNames, mode, selectedCanvasIndex, selectedWidgetIndex } = this.state;
    const widgets = this.currentWidgets();

    const complexWidgetDefinitions = canvases.slice(1).map(complexWidgetDefinition);

    const widgetDefinitions = normalizeWidgetDefinitions([
      ...WIDGET_DEFINITIONS,
      ...complexWidgetDefinitions
    ]);

    return (
      <div className="Dashboard">
        <div className="TopBar">
          <button
            type="button"
            onClick={this.toggleMode}
            style={{ fontSize: 'small', padding: '0.5em', width: '2em' }}
            className={classNames('form-control fa', {
              'fa-play': mode === 'edit',
              'fa-pause': mode === 'run'
            })}
            disabled={!this.isRootCanvas()}
          />
          <select
            className="form-control"
            style={{
              marginLeft: '0.5em',
              width: 'auto',
              height: 'auto',
              display: 'inline'
            }}
            onChange={this.handleChangeCanvas}
          >
            {canvases.map((canvas, i) => (
              <option key={i} value={i}>
                {i === 0 ? 'Root' : canvas.name}
              </option>
            ))}
          </select>
          {false && (
            <button type="button" onClick={() => alert(JSON.stringify(canvases))}>
              Dump
            </button>
          )}
        </div>
        {mode === 'edit' ? (
          <EditCanvas
            widgets={widgets}
            widgetDefinitions={widgetDefinitions}
            onMoveWidget={this.handleMoveWidget}
            onSelectWidget={this.handleSelectWidget}
            onDeleteWidget={this.handleDeleteWidget}
            selectedWidgetIndex={selectedWidgetIndex}
            onAddWidget={this.handleAddWidget}
          />
        ) : (
          <RunCanvas
            widgets={widgets}
            widgetDefinitions={widgetDefinitions}
            subCanvases={[null, ...canvases.slice(1)]}
          />
        )}
        {mode === 'edit' && (
          <div className="Sidebar">
            {selectedWidgetIndex === -1 ? (
              <Library
                widgetDefinitions={widgetDefinitions}
                showCustom={selectedCanvasIndex === 0}
              />
            ) : (
              <Inspector
                widget={widgets[selectedWidgetIndex]}
                widgetDefinitions={widgetDefinitions}
                deviceNames={deviceNames}
                onParamChange={this.handleParamChange}
                onDeviceChange={this.handleDeviceChange}
                onAttributeChange={this.handleAttributeChange}
                isRootCanvas={this.isRootCanvas()}
              />
            )}
          </div>
        )}
      </div>
    );
  }
}

Dashboard.propTypes = {
  history: PropTypes.string,
  location: PropTypes.shape({ search: PropTypes.string })
};

Dashboard.defaultProps = {
  history: '',
  location: { search: '' }
};

export default DragDropContext(HTML5Backend)(Dashboard);