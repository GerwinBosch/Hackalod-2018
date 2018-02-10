import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import 'leaflet/dist/leaflet.css'
import {TileLayer, Map, Marker, Popup }from 'react-leaflet';
import {IconButton, MuiThemeProvider, Slider} from 'material-ui';
import PlayArrow from 'material-ui/svg-icons/av/play-arrow'
import Pause from 'material-ui/svg-icons/av/pause'
import FastForward from 'material-ui/svg-icons/av/fast-forward'
import FastBackward from 'material-ui/svg-icons/av/fast-rewind'
import {SparqlClient} from 'sparql-client-2'
import L from 'leaflet'

// BUG https://github.com/Leaflet/Leaflet/issues/4968
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
L.Marker.prototype.options.icon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
})

const query = 'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n' +
    'Select distinct ?name ?jaar ?longitude ?latitude WHERE {\n' +
    '  ?s <http://dbeerpedia.com/def#categorie> <http://dbeerpedia.com/def#Bierbrouwerij>.\n' +
    '  ?s <http://dbeerpedia.com/def#address> ?address.\n' +
    '  ?s <http://schema.org/name> ?name.\n' +
    '  ?s <http://dbeerpedia.com/def#opgericht> ?jaar.\n' +
    '  ?address <http://schema.org/latitude> ?latitude.\n' +
    '  ?address <http://schema.org/longitude> ?longitude.\n' +
    '} Order by ?jaar'
class App extends Component {
  constructor(){
    super();
    this.state = {
      lat: 51.505,
      lng: 4.2,
      zoom: 13,
      playing:false,
      min:0,
      max:100,
      current:0,
      data:[],
    }
    const client = new SparqlClient('https://api.dev.triply.cc/datasets/GerwinBosch/hackalod-beer/services/hackalod-beer/sparql');
    client.query(query).execute((err, results) => {
      if (err) {
        console.error('oops',err)
        }
        console.info('results', results);
      this.setState({
        max: results.results.bindings.length -1 ,
        data: results.results.bindings,
      })
    });
  }
  toFirst = () => {
    this.setState({
      playing:false,
      current:0,
    })
  }
  toLast = () => {
    this.setState({
      playing:false,
      current:this.state.max,
    })
  }
  startStop = () => {
    if(!this.playing){
      setTimeout(this.stepper, 1000);
    }
    this.setState({playing:!this.state.playing})
  }
  stepper = () => {
    if(this.state.current +1 >= this.state.max){
      this.setState({
        playing:false,
        current:this.state.max,
      })
    } else if(this.state.playing) {
      this.setState({current:this.state.current+1})
      setTimeout(this.stepper, 1000);
    }

  }



  render() {
    const position = [this.state.lat, this.state.lng]
    const markers = [];
    let year = "0000";
    if(this.state.data.length > 0){
      year = this.state.data[this.state.current].jaar.value;
      for(let index = 0; index < this.state.current; index+=1 ){
        const datapoint = this.state.data[index]
        markers.push((
            <Marker position={[datapoint.latitude.value, datapoint.longitude.value]} key={datapoint.name.value}>
              <Popup>
                <span>{datapoint.name.value}</span>
              </Popup>
            </Marker>
        ))
      }
    }
    console.log(markers)
    return (
        <MuiThemeProvider>
          <div className="App">
            <Map
                style={{height:"100vh", zIndex:100}}
                center={position}
                zoom={13}
            >
              <TileLayer
                  attribution={"&copy; <a href=\"http://osm.org/copyright\">OpenStreetMap</a> contributors"}
                  url={"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
              />
              {markers}
            </Map>
          </div>
          <div className="YearInfo" style={{zIndex:10000,position:'absolute', top: '16px', right: '16px'}}>
            {year}
          </div>
          <div id="MapControls" style={{zIndex:10000,position:'absolute',width: '80vw', bottom:'20px', left:'10vw'}}>
            <Slider
                style={{width:'100%'}}
                min={this.state.min}
                max={this.state.max}
                onChange={(e, newVal) => {
                  console.log(newVal)
                  this.setState({current:newVal,
                  running:false})}}
                value={this.state.current}
                step={1}

            />
            <div id="playButtons" style={{display:'flex'}}>
              <div style={{flexGrow:1}}/>
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
                <div style={{flexGrow:1}}/>
            </div>
          </div>
        </MuiThemeProvider>
    );
  }
}

export default App;
