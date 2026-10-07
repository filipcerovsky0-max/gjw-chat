
#lightbox {
  position: absolute;
  left: 0;
  width: 100%;
  z-index: 10000;
  text-align: center;
  line-height: 0;
  display: none;
}

#lightbox_obsah {
  position: relative;
  background-color: #fff;
  width: 250px;
  height: 250px;
  margin: 0 auto;
}

#lightbox_obsah .obsah {
  padding: 10px;
}

#lightbox .nacitani {
  position: absolute;
  top: 40%;
  left: 0%;
  height: 25%;
  width: 100%;
  line-height: 0;
  background: url('https://www.gjwprostejov.cz/obrazky/lightbox_nacitani.gif') center center no-repeat;
}

#lightbox_navigace {
  position: absolute;
  top: 0px;
  left: 0px;
  height: 100%;
  width: 100%;
  z-index: 10;
}

#lightbox_navigace a {
  outline: none;
}

#lightbox_navigace .zpet, #lightbox_navigace .vpred {
  width: 49%;
  height: 100%;
  background: transparent url('https://www.gjwprostejov.cz/obrazky/lightbox_prazdny.gif') no-repeat;
  display: block;
}

#lightbox_navigace .zpet {
  left: 0px;
  float: left;
}

#lightbox_navigace .vpred {
  right: 0px;
  float: right;
}

#lightbox_navigace .zpet:hover {
  background: url('https://www.gjwprostejov.cz/obrazky/lightbox_predchozi.gif') left 50% no-repeat;
}

#lightbox_navigace .vpred:hover {
  background: url('https://www.gjwprostejov.cz/obrazky/lightbox_dalsi.gif') right 50% no-repeat;
}

#lightbox_popis {
  font-family: Tahoma, sans-serif;
  font-size: 8pt;
  background-color: #ffffff;
  margin: 0 auto;
  line-height: 1.4em;
}

#lightbox_popis .zpet, #lightbox_popis .vpred {
  color: #FF9834;
  font-weight: bold;
  text-decoration: none;
}

#lightbox_popis .popis {
  padding-left: 10px;
  padding-right: 10px;
  display: none;
}

#lightbox_popis .popis .detaily {
  float: left;
  text-align: left;
}

#lightbox_popis .popis .detaily .titulek {
  font-weight: bold;
}

#lightbox_popis .popis .detaily .informace {
  display: block;
  padding-bottom: 1.0em;
}

#lightbox_popis .popis .detaily .informace a {
  color: black;
}

#lightbox_popis .popis .zavrit {
  display: block;
  float: right;
  width: 66px;
  height: 22px;
  padding-bottom: 0.7em;
  background: url('https://www.gjwprostejov.cz/obrazky/lightbox_zavrit.gif') no-repeat;
}

#lightbox_seda {
  position: absolute;
  top: 0px;
  left: 0px;
  z-index: 90;
  width: 100%;
  height: 500px;
  background-color: #000;
  filter:alpha(opacity=60);
  -moz-opacity: 0.6;
  opacity: 0.6;
  display: none;
}
