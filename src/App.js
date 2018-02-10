import React, {Component} from 'react';
import './App.css';
import 'leaflet/dist/leaflet.css';
import {TileLayer, Map, Marker, Popup} from 'react-leaflet';
import {IconButton, MuiThemeProvider, Paper, Slider} from 'material-ui';
import PlayArrow from 'material-ui/svg-icons/av/play-arrow';
import Pause from 'material-ui/svg-icons/av/pause';
import FastForward from 'material-ui/svg-icons/av/fast-forward';
import FastBackward from 'material-ui/svg-icons/av/fast-rewind';
import {SparqlClient} from 'sparql-client-2';
import L from 'leaflet';
import Bar from 'material-ui/svg-icons/maps/local-bar';

// BUG https://github.com/Leaflet/Leaflet/issues/4968
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const blackBar = require('./blackBeer.svg');
const greenBar = require('./greenBeer.svg');
const goldBar = require('./goldBeer.svg');
L.Marker.prototype.options.icon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

const query = 'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n' +
    'Select distinct ?name ?jaar ?longitude ?latitude WHERE {\n' +
    '  ?s <http://schema.org/name> ?name.\n' +
    '  ?s <http://dbeerpedia.com/def#opgericht> ?jaar.\n' +
    '  ?s <http://schema.org/address>|<http://dbeerpedia.com/def#address> ?address.\n' +
    '  ?address <http://schema.org/latitude> ?latitude.\n' +
    '  ?address <http://schema.org/longitude> ?longitude.\n' +
    '} Order by ?jaar';

const steps = [100, 100, 100, 75, 75, 50, 50, 25, 5, 5, 5];

class App extends Component {
  constructor() {
    super();
    this.state = {
      lat: 52.13,
      lng: 5.15,
      zoom: 10,
      playing: false,
      min: 0,
      max: 100,
      current: 0,
      data: [],
      start: 1400,
    };
    const client = new SparqlClient(
        'https://api.dev.triply.cc/datasets/GerwinBosch/hackalod-beer/services/hackalod-beer/sparql');
    client.query(query).execute((err, results) => {
      if (err) {
        console.error('oops', err);
      }
      console.info('results', results);
      let max = 0;
      let lYear = results.results.bindings[results.results.bindings.length -
      1].jaar.value;
      let diff = lYear - this.state.start;
      let current = 0;
      while (diff > current) {
        if (current > 5000) {
          throw new Error('FUCK');
        }
        if (max >= steps.length) {
          current = current + 1;
        } else {
          current = current + steps[max];
        }
        max += 1;
      }
      this.setState({
        max: max,
        data: results.results.bindings,
      });
    });
  }

  toFirst = () => {
    this.setState({
      playing: false,
      current: 0,
    });
  };
  toLast = () => {
    this.setState({
      playing: false,
      current: this.state.max,
    });
  };
  startStop = () => {
    if (!this.playing) {
      setTimeout(this.stepper, 1000);
    }
    this.setState({playing: !this.state.playing});
  };
  stepper = () => {
    if (this.state.current + 1 >= this.state.max) {
      this.setState({
        playing: false,
        current: this.state.max,
      });
    } else if (this.state.playing) {
      this.setState({current: this.state.current + 1});
      setTimeout(this.stepper, 1000);
    }

  };

  render() {
    const position = [this.state.lat, this.state.lng];
    let year = this.state.start;
    for (let i = 0; i < this.state.current; i = i + 1) {
      if (i >= steps.length) {
        year = year + 1;
      } else {
        year = year + steps[i];
      }
    }
    let markers = [];
    if (this.state.data) {
      markers = this.state.data.filter(value => {
        console.log(value);

        return value.jaar.value <= year;
      }).map(datapoint => {
        let icon = blackBar;
        datapoint.jaar.value == year ? icon = greenBar : null;
        year - datapoint.jaar.value > 100 ? icon = goldBar : null;
        const iconPerson = new L.Icon({
          iconUrl: icon,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          tooltipAnchor: [16, -28],
          shadowSize: [41, 41],
        });
        return (
            <Marker
                position={[datapoint.latitude.value, datapoint.longitude.value]}
                key={datapoint.name.value} icon={iconPerson}>
              <Popup>
                <span>{datapoint.name.value} {datapoint.jaar.value}</span>
              </Popup>
            </Marker>
        );
      });
    }
    console.log(Bar);
    return (
        <MuiThemeProvider>
          <div className="App">
            <Map
            style={{height: '100vh', zIndex: 100}}
                center={position}
                zoom={8}
            >
              <TileLayer
                  attribution={'&copy; Kaartgegevens © Kadaster | <a href="http://www.verbeterdekaart.nl/" target="_blank">verbeter de kaart</a>'}
                  url={'https://geodata.nationaalgeoregister.nl/tiles/service/wmts/brtachtergrondkaart/EPSG:3857/{z}/{x}/{y}.png'}
              />
              {markers}
            </Map>
          </div>
          <Paper className="Title" style={{
            zIndex: 10000,
            position:'absolute',
            left: '54px',
            top: '12px',
            display:'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: '10px',
          }}>

            <h1>Brouwerij Tijdreis</h1>
            <IconButton
                iconClassName="muidocs-icon-custom-github"
                href="https://github.com/GerwinBosch/hackalod-2018"
            />

          </Paper>
          <Paper className="YearInfo" style={{
            zIndex: 10000,
            position: 'absolute',
            top: '16px',
            right: '16px',
          }}>
            {year}
          </Paper>
          <div id="MapControls" style={{
            zIndex: 10000,
            position: 'absolute',
            width: '80vw',
            bottom: '20px',
            left: '10vw',
          }}>
            <Slider
                style={{width: '100%'}}
                min={this.state.min}
                max={this.state.max}
                onChange={(e, newVal) => {
                  this.setState({
                    current: newVal,
                    running: false,
                  });
                }}
                value={this.state.current}
                step={1}

            />
            <div id="playButtons" style={{display: 'flex'}}>
              <div style={{flexGrow: 1}}/>
              <IconButton>
                <FastBackward onClick={this.toFirst}/>
              </IconButton>
              <IconButton
                  onClick={this.startStop}
              >
                {this.state.playing ? <Pause/> : <PlayArrow/>}
              </IconButton>
              <IconButton>
                <FastForward onClick={this.toLast}/>
              </IconButton>
              <div style={{flexGrow: 1}}/>
            </div>
          </div>
        </MuiThemeProvider>
    );
  }
}

export default App;
