import React, { PureComponent } from 'react';
import { PanelProps } from '@grafana/data';
import { MapOptions, FieldBuffer } from 'types';
import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import nanoid from 'nanoid';
import 'ol/ol.css';
import { processReceivedData } from './utils/helperFunc';

interface Props extends PanelProps<MapOptions> {}
interface State {
  options: string[];
  current: string;
  vendorName: string;
}

export class MainPanel extends PureComponent<Props> {
  id = 'id' + nanoid();
  map: Map;
  randomTile: TileLayer;
  perUserRoute: { [key: string]: [number, number][] };
  perUserRouteRadius: { [key: string]: number[] };
  perUserVendorName: { [key: string]: string };
  route: VectorLayer;

  state: State = {
    options: [],
    current: 'None',
    vendorName: '',
  };

  componentDidMount() {
    const { center_lat, center_lon, zoom_level, max_zoom, tile_url } = this.props.options;

    const fields = this.props.data.series[0].fields as FieldBuffer[];

    const carto = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });

    if (fields[2].values.buffer.length === 0) {
      this.map = new Map({
        interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
          new DragPan({
            condition: function(event) {
              return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
            },
          }),
          new MouseWheelZoom({
            condition: platformModifierKeyOnly,
          }),
        ]),
        layers: [carto],
        view: new View({
          center: fromLonLat([center_lon, center_lat]),
          zoom: zoom_level,
          maxZoom: max_zoom,
        }),
        target: this.id,
      });
    } else {
      this.map = new Map({
        interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
          new DragPan({
            condition: function(event) {
              return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
            },
          }),
          new MouseWheelZoom({
            condition: platformModifierKeyOnly,
          }),
        ]),
        layers: [carto],
        view: new View({
          center: fromLonLat([fields[2].values.buffer[0], fields[1].values.buffer[0]]),
          zoom: zoom_level,
          maxZoom: max_zoom,
        }),
        target: this.id,
      });

      const { perUserRoute, perUserRouteRadius, perUserVendorName } = processReceivedData(this.props.data.series[0].length, fields);

      this.perUserRoute = perUserRoute;
      this.perUserRouteRadius = perUserRouteRadius;
      this.perUserVendorName = perUserVendorName;
      this.setState({
        options: Object.keys(this.perUserRoute),
      });
    }

    if (tile_url !== '') {
      this.randomTile = new TileLayer({
        source: new XYZ({
          url: tile_url,
        }),
        zIndex: 1,
      });
      this.map.addLayer(this.randomTile);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.data.series[0] !== this.props.data.series[0]) {
      const prevFields = prevProps.data.series[0].fields as FieldBuffer[];
      const newFields = this.props.data.series[0].fields as FieldBuffer[];
      if (prevFields[1].values.buffer.length === 0 && newFields[1].values.buffer.length !== 0) {
        this.map.getView().animate({
          center: fromLonLat([newFields[2].values.buffer[0], newFields[1].values.buffer[0]]),
          duration: 2000,
        });
      }

      const { perUserRoute, perUserRouteRadius, perUserVendorName } = processReceivedData(this.props.data.series[0].length, newFields);

      this.perUserRoute = perUserRoute;
      this.perUserRouteRadius = perUserRouteRadius;
      this.perUserVendorName = perUserVendorName;
      this.setState({ options: Object.keys(this.perUserRoute) });
    }

    if (prevProps.options.tile_url !== this.props.options.tile_url) {
      if (this.randomTile) {
        this.map.removeLayer(this.randomTile);
      }

      if (this.props.options.tile_url !== '') {
        this.randomTile = new TileLayer({
          source: new XYZ({
            url: this.props.options.tile_url,
          }),
          zIndex: 1,
        });
        this.map.addLayer(this.randomTile);
      }
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level) {
      this.map.getView().setZoom(this.props.options.zoom_level);
    }

    if (prevState.current !== this.state.current) {
      this.route && this.map.removeLayer(this.route);

      if (this.state.current !== 'None') {
        /*         const styles: { [key: string]: Style } = {
          route: new Style({
            stroke: new Stroke({
              color: '#0080ff',
              width: 2,
            }),
          }),
          start: new Style({
            image: new Circle({
              radius: 4,
              fill: new Fill({ color: '#26de00' }),
            }),
          }),
          end: new Style({
            image: new Circle({
              radius: 4,
              fill: new Fill({ color: '#feda21' }),
            }),
          }),
        };
        const routeData = this.perUser[this.state.current].map(item => fromLonLat(item));
        this.route = new VectorLayer({
          source: new VectorSource({
            features: [
              new Feature({
                type: 'route',
                geometry: new LineString(routeData),
              }),
              new Feature({
                type: 'start',
                geometry: new Point(routeData.slice(0, 1)[0]),
              }),
              new Feature({
                type: 'end',
                geometry: new Point(routeData.slice(-1)[0]),
              }),
            ],
          }),
          zIndex: 2,
          style: feature => {
            return styles[feature.get('type')];
          },
        }); */
        const routeData = this.perUserRoute[this.state.current].map(item => fromLonLat(item));
        const routeRadiusData = this.perUserRouteRadius[this.state.current];

        const routeFeature = new Feature(new LineString(routeData));
        routeFeature.setStyle(
          new Style({
            stroke: new Stroke({
              color: '#0080ff',
              width: 2,
            }),
          })
        );

        const pointFeatures = routeData.map((coordinate, index) => {
          const singlePoint = new Feature(new Point(coordinate));
          singlePoint.setStyle(
            new Style({
              image: new Circle({
                radius: routeRadiusData[index],
                fill: new Fill({ color: '#26de00' }),
              }),
            })
          );
          return singlePoint;
        });

        this.route = new VectorLayer({
          source: new VectorSource({
            features: [routeFeature, ...pointFeatures],
          }),
        });

        this.map.addLayer(this.route);
      }
    }
  }

  handleSelector = (e: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({ current: e.target.value });
  };

  render() {
    const { width, height } = this.props;
    const { options, current } = this.state;

    return (
      <div
        style={{
          width,
          height,
        }}
      >
        <select id="selector" onChange={this.handleSelector} value={current} style={{ width: 500, marginBottom: 5 }}>
          <option value="None">None</option>
          {options.map(item => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <div
          id={this.id}
          style={{
            width,
            height: height - 40,
          }}
        ></div>
      </div>
    );
  }
}
