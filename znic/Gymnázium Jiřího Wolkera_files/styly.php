
.mceEditor *,
.mceEditor {
  box-sizing: content-box;
}

table th p,
table td p {
  margin-top: 0;
  margin-bottom: 0;
}

.ico {
  margin-right: 5px;
}

.posTop {
  width: 100%;
  position: relative;
  z-index: 3000;
}

#komponenta {
  position: relative;
}

.nadpis {
  color: #2e2e2e;
  font-size: 22px;
  font-weight: normal;
  padding: 0px;
  margin: 0px;
  margin-bottom: 12px;
  padding-bottom: 0px;
  border-bottom: 1px solid #a9a9a9;
}

.uzivatel {
  position: relative;
}

.podnadpis {
  color: #2e2e2e;
  font-size: 18px;
  font-weight: normal;
  padding: 0px;
  margin: 0px;
  width: 100%;
  border-bottom: 1px solid #a9a9a9;
  padding-bottom: 2px;
  margin-bottom: 6px;
  padding-top: 11px;
}

.podnadpis .b {
  font-size: 20px;
  padding-top: 20px;
}

.podnadpis a {
  color: #003865;
  text-decoration: none;
}

.podpodnadpis {
  font-size: 16px;
  margin-left: 5px;
  margin-bottom: 3px;
}






/********************************************************************************
 * Zalozky
 ********************************************************************************/
.zalozky {
  margin: 0 0 1em 0;
}

.zalozky a {
  display: inline-block;
  text-decoration: none;
  color: #003865;
  padding: 2px 8px;
}

.zalozky a:hover {
  color: #005a89;
  text-decoration: underline;
}

.zalozky a.aktivni {
  background: #fff;
  font-weight: bold;
  color: #005a89;
}





/********************************************************************************
 * Vypisy
 ********************************************************************************/

.vypis td p {
  padding: 0;
  margin: 0;
  line-height: 1em;
}

.vypis_bez td p {
  padding: 0;
  line-height: 1em;
  margin: 1em 0
}

.vypis, .vypis_bez, .tabulka {
  border-collapse: collapse;
  border-spacing: 0px;
  width: 100%;
}

.vypis tr th {
  background-color: #d8d8d8;
  text-align: left;
  border-top: 1px solid #999999;
  border-bottom: 1px solid #999999;
  color: #626262;
  font-weight: normal;
  padding-left: 5px;
  padding-right: 5px;
}

.vypis tr td,.vypis_bez tr td {
  text-align: left;
  padding-left: 5px;
  padding-right: 5px;
  border: 1px solid #d7d7d7;
}

.vypis_bez tr td {
  border: 0;
  padding: 0;
}

.vypis tr .tdDiv,.vypis_bez tr .tdDiv {
  text-overflow: ellipsis;
  overflow: hidden;
}

.vypis .sudyRadek {
  background-color: #f9f9f9;
}

.vypis_bez .sudyRadek {
  background-color: #f2f2f2;
}

.vypis .lichyRadek, .vypis_bez .lichyRadek {
  background-color: #ffffff;
}

.vypis .zapati td {
  background-color: #f3f3f3;
  color: #626262;
}

.vypis_bez .zapati td {
  padding-top: 0px;
  padding-bottom: 0px;
}

.vypis .zapati a {
  color: #626262;
}

.vypis .stranky,.vypis_bez .stranky {
  text-align: center;
  padding-top: 3px;
  padding-bottom: 3px;
}

.vypis .nastranku,.vypis_bez .nastranku {
  display: none;
  position: absolute;
  padding-top:1px;
}

.vypis .akce td {
  border: 0px;
  padding-bottom: 3px;
}

.vypis_bez .akce td {
  padding-bottom: 0px;
  padding-top: 0px;
  padding-left: 7px;
  padding-right: 7px;
}

.vypis .akce a, .vypis_bez .akce a {
  color: #003865;
  font-weight: bold;
  margin: 0 0 0 5px;
  text-decoration: none;
}
.vypis .akce a:hover, .vypis_bez .akce a:hover {
  color: #000;
}


.vypis .akce td .vybertyp,.vypis_bez .akce td .vybertyp {
  color: #626262;
  font-size: 14px;
}

.vypis .akce td .vybertyp a,.vypis_bez .akce td .vybertyp a {
  color: #626262;
  font-size: 14px;
}

.vypis_bez .akce td .vybertyp, .vypis_bez .akce td .vybertyp a, .vypis_bez .zapati td, .vypis_bez .zapati a {
  --color: white;
}

.vypis .akce td select.vyberakce,.vypis_bez .akce td select.vyberakce {
  font-size: 14px;
}

.vypis .akce td .left,.vypis_bez .akce td .left {
  position: relative;
  left: -4px;
}

.vypis .akce td .right,.vypis_bez .akce td .right {
  position: relative;
  left: 4px;
}

.razeni a {
  color: #626262;
  text-decoration: none;
  display: block;
  width: 100%;
}

.razeni.razeni_hover {
  background-color: #e9e9e9;
}

.razeni0 {
  background: url('https://www.gjwprostejov.cz/obrazky/smer0.gif') no-repeat right;
}

.razeni1 {
  background: url('https://www.gjwprostejov.cz/obrazky/smer1.gif') no-repeat right;
}

.prihlaseni0, .zverejnia0, .zverejnib0, .zverejnic0, .zverejnik0 {
  padding-left: 20px;
  background: url('https://www.gjwprostejov.cz/obrazky/zverejni0.png') no-repeat right;
  text-decoration: none;
}

.prihlaseni1, .zverejnia1, .zverejnib1, .zverejnic1, .zverejnik1 {
  padding-left: 20px;
  background: url('https://www.gjwprostejov.cz/obrazky/zverejni1.png') no-repeat right;
  text-decoration: none;
}

.forumz0, .forumo0, .forumu0, .forumt0 {
  padding-left: 20px;
  background: url('https://www.gjwprostejov.cz/obrazky/zverejni0.png') no-repeat right;
  text-decoration: none;
}

.forumz1, .forumo1, .forumu1, .forumt1 {
  padding-left: 20px;
  background: url('https://www.gjwprostejov.cz/obrazky/zverejni1.png') no-repeat right;
  text-decoration: none;
}

.divChart {
  display: block;
  min-height: 5px;
  background: #98AFC0;
  border: 1px solid #98AFC0;
  width: 15px;
  margin: 10px auto 0;
}

.tdChart {
  text-align: center;
  vertical-align: bottom;
}



/********************************************************************************
 * Formulare
 ********************************************************************************/

.label {
  float: left;
  width: 18.4em;
  text-align: left;
  margin-bottom: 5px;
}

.labelSmall {
  float: left;
  width: 11.4em;
  text-align: left;
  padding-top: 3px;
}

.tareaLabel {
  vertical-align: top;
}

.cboxLabel {
  vertical-align: 2px;
}

.cbox,
.rbox {
  margin: 2px 5px;
}

.rboxLabel {
  vertical-align: 2px;
}

.light {
  margin-left: 10px;
  color: #000;
}

.light.disabled {
  color: #888;
  background: #eee;
}

.submit {
  margin-top: 10px;
}

.chyba {
  color:red;
}

.vykricnik {
  position: absolute;
  width: 14px;
  height: 14px;
  z-index: 100;
  background: url('https://www.gjwprostejov.cz/obrazky/form_ko.png');
}

.bublina {
  font-size: 14px;
  position: absolute;
  width: 200px;
  z-index: 100;
}

.bublina_horni {
  height: 8px;
  background: url('https://www.gjwprostejov.cz/obrazky/bublina_modra_horni.gif') no-repeat;
}

.bublina_stredni {
  padding-left:20px;
  background: url('https://www.gjwprostejov.cz/obrazky/bublina_modra_stred.gif') repeat-y;
}

.bublina_dolni {
  height: 10px;
  background: url('https://www.gjwprostejov.cz/obrazky/bublina_modra_dolni.gif') no-repeat;
}

#editor_div {
  padding-left: 10px;
}

textarea#editor {
  height: 500px;
  width: 645px;
}

textarea#editor.light {
  height: 150px;
  width: 600px;
}

div#editor {
}

.adresaPristupna {
  color: grey;
  font-size: 11px;
  font-weight: normal;
}

.datum, .datumod {
  width: 150px;
}

 .povinne {
  font-weight: bold;
  color: #000;
}



 /********************************************************************************
 * Pomocne
 ********************************************************************************/

 .none { display: none; }
.block { display: block; }
.clear { clear: both; }
.left { float: left; }
.right { float: right; }
.tCenter { text-align: center; }
.tLeft { text-align: left; }
.tRight { text-align: right; }
.top { vertical-align: top; }
.middle { vertical-align: middle; }
.bottom { vertical-align: bottom; }
.b { font-weight: bold; }
.i { font-style: italic; }
.paddT { padding-top: 10px; }
.paddT5 { padding-top: 5px; }
.paddB { padding-bottom: 10px; }
.paddL { padding-left: 10px; }
.paddL23 { padding-left: 23px; }
.paddR { padding-right: 10px; }
.margT { margin-top: 10px; }
.margB { margin-bottom: 10px; }
.margL25 { margin-left: 25px; }
.margR { margin-right: 10px; }
.bold { font-weight: bold; }
.w200 { width: 200px; }
.w400 { width: 400px; }
.w600 { width: 600px; }




body .ui-datepicker {
  font-family: Tahoma,sans-serif;
  font-size: 14px;
}

body .ui-dialog {
  font-family: Tahoma,sans-serif;
  font-size: 15px;
}

.aktualita {
  padding: 10px 5px;
}

.clanky {
  background: #fff;
  padding: 10px 5px;
  border-bottom: 1px solid #ccc;
}

.clanky .popis {
  padding: 3px 0;
}

.clanky a {
  font-weight: bold;
}

.clanky a.clanekNadpis {
  font-size: 18px;
  color: #003865;
  text-decoration: none;
}

.clanky .den {
  color: #67686D;
}

.clanky a.clanekVice {
  color: #003865;
}

.clanky .zapati a {
  color: #003865;
}

.clanky .zapati a:hover {
  color: #005a89;
}

#forumOdpovedi {
  padding: 10px 0;
}

#forumOdpovedi .vypis tr,
#forumOdpovedi .vypis_bez tr {
  background: none;
}

a.button.aktualizovat {
  font-weight: bold;
  font-size: 14px;
  padding: 2px 10px 2px 30px;
  background: #000 url(https://www.gjwprostejov.cz/obrazky/nacitani3.png) no-repeat 5px center;
  border: 1px solid #000;
  color: #fff;
  text-decoration: none;
}

a.button.aktualizovat:hover {
  color: #fff;
  text-decoration: none;
}

a.button.aktualizuji {
  font-weight: bold;
  font-size: 14px;
  padding: 2px 10px 2px 30px;
  background: #F0F0F0 url(https://www.gjwprostejov.cz/obrazky/nacitani2.gif) no-repeat 5px center;
  border: 1px solid #aaa;
  color: #888;
  text-decoration: none;
}

a.button.aktualizuji:hover {
  color: #888;
  text-decoration: none;
}

form#forum {
  background: #fff;
  padding: 0 10px 10px;
  margin: 10px 0 0 0;
}

#form_forumOtazka {
  padding: 5px;
  margin: 5px;
  background: #F3F3F3;
}

#form_forumOtazka .label {
  width: 10em;
}

.forumOdpoved {
  display: block;
  width: 100%;
  overflow: hidden;
  padding: 5px 0 0 0;
  margin: 5px 0 0 0;
}

.divOdpovida {
  font-style: italic;
}

.upozorneni {
  color: red;
  margin: 1em 0;
}

a.jeOtevreny {
  background: url('https://www.gjwprostejov.cz/obrazky/comment.png') no-repeat left center;
  font-weight: bold;
  padding-left: 20px;
  color: #a22;
}

.idForum {
  overflow: hidden;
  position: relative;
}
.divForumSloupec {
  float: left;
  margin-bottom: 5px;
  width: 25%;
}