/*
  const lightbox = GLightbox({
    touchNavigation: true
  });
*/

var texty,
    forumInterval = null,
    forumPokracovat = true;

$(function() {
  var $body = $('body');

  // nacteni textu vlozenych do stranky
  texty = $.parseJSON($('#texty').html());

  // zobrazeni stavove zpravy formulare
  zobrazVysledekFormu();

  postAjax('body');

  // chybove zpravy
  $body.delegate('.js-toast', 'click', function (event) {
    event.preventDefault();
    $(this).css('display', 'none');
    return false;
  });

  $body.delegate('.js-toast', 'mouseenter', function (event) {
    $(this).stop(true, true);
    $(this).css('display', '');
  });

  $body.delegate('.js-toast', 'mouseleave', function (event) {
    $(this).animate({ opacity: 'hide' }, 4000);
  });

  // prihlasovaci dialog
  $body.delegate('.js-user', 'click', function (event) {
    event.preventDefault();
    $('.js-user-block').toggleClass('u-hidden');
    return false;
  });

  // vlajka
  $body.delegate('.js-lang', 'click', function (event) {
    event.preventDefault();
    $('.js-lang-block').toggleClass('u-hidden');
    return false;
  });

  // vyber vlajky
  $body.delegate('.js-flag', 'click', function (event) {
    event.preventDefault();
    $(this).parents('form').submit();
    return false;
  });

  // hledej
  $body.delegate('.js-search', 'submit', function () {
    if ($('#hv').val() == '') {
      return false;
    }
  });













  ////////////////////////////////////////////////////////////////////////////////
  // Change Handlers

  // funkcionalita nabidky strankovani
  $body.delegate('.nastranku select', 'change', function() {
    var vypisId = $(this).parents('table').attr('id').substr(5);
    var url = odstranZurl(doplnText('kompletni_url'),['strankovani'+vypisId]);
    $(location).attr('href', url + (url.search('[?]') != -1? '&' : '?') + 'strankovani' + vypisId + '=' + $(this).val());
  });

  // automaticky odesilany select
  $body.delegate('.vyberakce,#filtr,.filtr', 'change', function() {
    $(this).parents('form').submit();
  });

  $body.delegate('.filtr_cat', 'change', function() {
    var vypisId = $(this).parents('table').attr('id').substr(5);
    var url = odstranZurl(doplnText('kompletni_url'),['idk'+vypisId]);
    $(location).attr('href', url + (url.search('[?]') != -1? '&' : '?') + 'idk' + vypisId + '=' + $(this).val());
  });


  ////////////////////////////////////////////////////////////////////////////////
  // Click Handlers

  // forum
  $body.delegate('a[class=forumz0],a[class=forumz1],a[class=forumo0],a[class=forumo1],a[class=forumu0],a[class=forumu1],a[class=forumt0],a[class=forumt1]','click', function() {
    var param = new Object(),
        $this = $(this);
        textId = "id" + $this.attr('class').substr(5,1),
        trida = $this.attr('class').substr(0,6),
        id = $this.attr('id').substr(7);

    param[textId] = id;
    param['typ'] = $this.attr('class').substr(6);

    $.post(doplnUrl('Strom','forum',param),function(data) {
  	  var arrData = urciVysledekFormu(data,'|',4);
  	  if (arrData[0] != 0) {
        $this.attr('class',trida + arrData[1])
        var $parent = $this.parent();
        if ($parent.find('span').length) {
          $this.next().remove();
          $parent.append(arrData[2]);
        }
        if (arrData[3]) {
          var $forumo = $('#forumo_'+id),
              $forumoParent = $forumo.parent();
          $forumo.attr('class', trida.substr(0, (trida.length - 1)) + 'o1');
          if ($forumoParent.find('span').length) {
            $forumo.next().remove();
            $forumoParent.append(arrData[3]);
          }
        }
  	  }
  	  else {
  	    zobrazVysledekFormu(0,arrData[1]);
  	  }
  	});
  	return false;
  });

  // hlasovani v ankete
  $body.delegate('a[class=hlasuj]', 'click', function() {
    $.post(doplnUrl('Strom','hlasuj',{id: $(this).attr('id').substr(7)}),function(data) {
      var arrData = urciVysledekFormu(data,'|',3);
      if (arrData[0] != 0) {
        $('#anketa').html($(data.substr(arrData[0].length + arrData[1].length + 2)).html());
      }
      zobrazVysledekFormu(arrData[0],arrData[1]);
    });
    return false;
  });

  // pravo prihlaseni
  $body.delegate('a[class=prihlaseni0],a[class=prihlaseni1]', 'click', function() {
    $.post(doplnUrl('Strom','pravoPrihlaseni',{id: $(this).attr('id').substr(11),typ: $(this).attr('class').substr(10)}),function(data) {
      var arrData = urciVysledekFormu(data,'|',2);
      if (arrData[0] != 0) {
        $('#prihlaseni_' + arrData[0]).attr('class','prihlaseni' + arrData[1]);
      }
      else {
        zobrazVysledekFormu(0,arrData[1]);
      }
    });
    return false;
  });

  // zmena hesla
  $body.delegate('a[class=zmenHeslo]', 'click', function() {
    $.post(doplnUrl('Strom','zmenHeslo',{id: $(this).attr('id').substr(10)}),function(data) {
      var arrData = urciVysledekFormu(data,'|',2);
      zobrazVysledekFormu(arrData[0],arrData[1]);
    });
    return false;
  });

  // zverejneni kurzu
  $body.delegate('a[class=zverejnic0],a[class=zverejnic1],a[class=zverejnia0],a[class=zverejnia1],a[class=zverejnib0],a[class=zverejnib1],a[class=zverejnik0],a[class=zverejnik1]', 'click', function() {
    var param = new Object();
    var textId = "id" + $(this).attr('class').substr(8,1);
        param[textId] = $(this).attr('id').substr(9);
        param['typ'] = $(this).attr('class').substr(9);

    $.post(doplnUrl('Strom','zverejni',param),function(data) {
      var arrData = urciVysledekFormu(data,'|',2);
      if (arrData[0] != 0) {
        if (doplnText('id_clanek')) {
          location.reload();
        }
        else if(arrData[1].substr(0,1) == 'k') {
          arrIdKategorie = arrData[0].split(',');
          for (var klic in arrIdKategorie) {
            $('#zverejni_' + arrIdKategorie[klic]).attr('class','zverejni' + arrData[1]);
          }
        }
        else {
          $('#zverejni_' + arrData[0]).attr('class','zverejni' + arrData[1]);
        }
      }
      else {
        zobrazVysledekFormu(0,arrData[1]);
      }
    });
    return false;
  });

  // aktivuj neaktivni
  $body.delegate('.aktivuj', 'click', function() {
    var elem = $('.neaktivni_' + $(this).attr('id').substr(8));
    elem.attr('disabled',(elem.attr('disabled')? '' : 'disabled'));
  });

  // zobrazeni odpovedi na otazku
  $body.delegate('.forumOtazka', 'click', function() {
    var $form = $('#form_forumOtazka'),
        $zobraz = $('.skryte_' + $(this).attr('id').substr(7));
        $form.removeClass('none');

    if ($zobraz.hasClass('none')) {
      $('.skryte').addClass('none');

      $.ajax({
        url : $(this).attr('href'),
        data : 'ajax=1',
        beforeSend : function() {
          $zobraz.removeClass('none').html('<img src="https://www.gjwprostejov.cz/obrazky/nacitani.gif">');
        },
        success : function(data) {
          $zobraz.empty().append($(data).find('#form_forumOtazka'));
          // nacteni editoru
          if ($('textarea#editor').length) {
            if ($('textarea#editor').hasClass('light'))
              var editor = new EditorLight('editor');
            else
              var editor = new Editor('editor');
          }
          $('#form_forumOtazka').submit(function() {
            var $this = $(this);
            $this.find('.submit').attr('disabled', 'disabled').addClass('.disabled');
            $.ajax({
              url : $this.attr('action') + '&ajax=1',
              data : $this.serialize(),
              type : 'POST',
              success : function(data) {

            	// refresh stranky
            	$.get(window.location, function(data) {
            	  // obsolete: nahrazeni editovaneho radku
                  // var index = $('#vypis').find('tr').index($this.parents('tr').first());
                  // $this.parents('tr').replaceWith($(data).find('#vypis tr').eq(index));
                  $('#vypis').replaceWith($(data).find('#vypis'));
                  zobrazVysledekFormu('1',doplnText('form_ok'));
	        	});

              }
            });
            return false;
          });
        },
        error : function() {
          zobrazVysledekFormu('0',doplnText('forum_chybaFormu'));
          $zobraz.empty().addClass('none');
        }
      });
    }
    else {
      $zobraz.addClass('none').empty();
    }

    return false;
  });

  // nastaveni ukazky kurzu
  $body.delegate('.kategorie_cbox', 'click', function() {
    vyberKategorii($(this),false);
  });


  // hromadny vyber vsech prvku vypisu
  $body.delegate('.vyber', 'click', function() {
    var vypisId = $(this).parents('table').attr('id').substr(5);
    var vypisElem = $('#vyber' + vypisId + '_0');
    $('#vypis' + vypisId).find('input').each(function(index,element) {
      if (element.id != vypisElem.attr('id') && element.id.search('^vyber' + vypisId + '_.*') != -1) {
        $(element).attr('checked',vypisElem.attr('checked'));
      }
    });
  });

  // alternativni hromadny vyber pro vypisy nevytvorene pomoci new Vypis(...)
  $body.delegate('.vyberVse', 'click', function() {
    var vypisElem = $(this);
    $('.vybrat').each(function(index,element) {
      $(element).attr('checked',vypisElem.attr('checked'));
    });
  });

  // zobraz skryte
  $body.delegate('.zobraz', 'click', function() {
    var elem = $('.skryte_' + $(this).attr('id').substr(7));
    elem.css('display',(elem.css('display') == 'none'? 'block' : 'none'));
    return false;
  });

  $body.delegate('a', 'click', function() {
    var $this = $(this),
        href = $this.attr('href');

    if ($this.attr('target') == '_blank' && /^file\//.test(href)) {
      $this.attr('href', doplnUrl('Soubor',null,{id: href.substr(5), blank: '1'}));
    }
  });


  ////////////////////////////////////////////////////////////////////////////////
  // Key Up Handlers

  // adresy
  $body.delegate('.adresa', 'keyup', function() {
    overAdresu($(this),1);
  });






  ////////////////////////////////////////////////////////////////////////////////
  // Dialogy

  // tlacitka dialogu necinnosti
  var tlacitka = new Object();
  tlacitka[doplnText('ano')] = function(){
    $.post(doplnUrl('Strom','timeout',{}),function(data) {
      $('#timeoutDialog').dialog('close');
    });
  };
  tlacitka[doplnText('ne')] = function(){
    $('#timeoutDialog').dialog('close');
  };

  // dialog necinnosti
  $('#timeoutDialog').dialog({
    autoOpen: false,
    resizable: false,
    modal: true,
    buttons: tlacitka,
    beforeClose: function(event, ui) {
      if (interval = $('#timeoutDialog').data('interval')) {
        clearInterval(interval);
      }
      $('#timeoutDialog').data('otevren',0);
      $('#timeoutDialog').data('interval',0);
      return true;
    }
  });

  // tlacitka dialogu odhlaseni
  var tlacitka = new Object();
  tlacitka[doplnText('ok')] = function(){
    $('#odhlasenDialog').dialog('close')
  };

  // dialog odhlaseni
  $('#odhlasenDialog').dialog({
    autoOpen: false,
    resizable: false,
    modal: true,
    buttons: tlacitka
  });

  // timeout
  var jePrihlaseny = parseInt(doplnText('prihlaseny'));
  if (!isNaN(jePrihlaseny) && jePrihlaseny) {
    overTimeout();
  }


















});



////////////////////////////////////////////////////////////////////////////////
// Prace s Formem

function urciVysledekFormu(data,oddelovac,pocet) {
  var arrData = data.split(oddelovac,pocet);
  if (isNaN(parseInt(arrData[0]))) {
    arrData[0] = 0;
    arrData[1] = doplnText('neopravnen');
  }
  return arrData;
}

function zobrazVysledekFormu(vysledek,text) {
  var $zprava = $('.js-toast').first();

  if (typeof (vysledek) != 'undefined') {
    if (vysledek != 0) {
      $zprava.removeClass('e-toast--error');
      $zprava.addClass('e-toast--success');
    }
    else {
      $zprava.removeClass('e-toast--success');
      $zprava.addClass('e-toast--error');
    }
  }
  if (typeof (text) != 'undefined') {
    $zprava.html(text);
  }

  if ($zprava.text() != '') {
    $zprava.css('display', '');
    $zprava.animate({ opacity: '1' }, 6000, function() {
      $zprava.animate({ opacity: 'hide' }, 4000);
    });
  }

}



////////////////////////////////////////////////////////////////////////////////
// Zakladni funkce

function doplnText(kod) {
  if (vrat = texty[kod]) {
    return vrat;
  }
  else {
    return $('#' + kod).text();
  }
}

function vytvorAdresu(str,delka) {
  var arrPrevod = {'á':'a', 'č':'c', 'ď':'d', 'é':'e', 'ě':'e', 'í':'i', 'ň':'n', 'ó':'o', 'ř':'r', 'š':'s', 'ť':'t', 'ú':'u', 'ů':'u', 'ý':'y', 'ž':'z'};
  var str1 = str.toLowerCase();
  var str2 = '';
  for (var i = 0; i < str1.length; i++) {
    var znak = str1.charAt(i);
    str2 += (typeof arrPrevod[znak] == 'undefined'? znak : arrPrevod[znak]);
  }
  return str2.replace(/[^a-z0-9\-]+/g,'-').substr(0,delka).replace(/^[^a-z]*/g,'');
}



////////////////////////////////////////////////////////////////////////////////
// Prace s URL

function doplnZaklad() {
  var zaklad = doplnText('zakladni_url');
  var pozice = zaklad.indexOf("?");
  return (pozice != -1? zaklad.substr(pozice) : '');
}

function doplnUrl(cast,akce,arrParam) {
  $.extend((arrParam? arrParam : {}),(cast? {cast: cast} : {}),(akce? {akce: akce} : {}));
  var i = 0;
  var arrDopln = Array();
  for (var klic in arrParam) {
    arrDopln[i] = klic + '=' + arrParam[klic];
    i++;
  }
  var zaklad = doplnText('zakladni_url');
  return zaklad + (arrParam? (zaklad.search('[&]') != -1? '&' : (zaklad.search('[?]') != -1? '&' : '?')) + arrDopln.join('&') : '');
}

function odstranZurl(url,arrOdstran) {
  var arrVysledek = Array();
  var arrOtaznik = url.split('?',2);
  if (arrOtaznik[1]) {
    var arrPary = arrOtaznik[1].split('&');
    var arrParyVel = arrPary.length;
    for (var i = 0; i < arrParyVel; i++) {
      var arrParam = arrPary[i].split('=',2);
      if (jQuery.inArray(arrParam[0],arrOdstran) == -1) {
        arrVysledek.push(arrPary[i]);
      }
    }
  }
  return arrOtaznik[0] + (arrVysledek.length? '?' + arrVysledek.join('&') : '');
}

function ziskejZurl(url,param) {
  var arrOtaznik = url.split('?',2);
  if (arrOtaznik[1]) {
    var arrPary = arrOtaznik[1].split('&');
    var arrParyVel = arrPary.length;
    for (var i = 0; i < arrParyVel; i++) {
      var arrParam = arrPary[i].split('=',2);
      if (arrParam[0] == param) {
        return arrParam[1];
      }
    }
  }
  return '';
}

function ziskejHezkeUrl(url) {
  var adresa = url;
  var pozice = adresa.indexOf('://');
  adresa = (pozice != -1? 'https://' + adresa.substr(pozice+3) : adresa);
  pozice = adresa.indexOf('?');
  return (pozice != -1? adresa.substr(0,pozice) : adresa);
}

















































function preAjax(kontext) {
  window.clearInterval(forumInterval);
  forumPokracovat = true;
}

function postAjax(kontext) {
  // nacteni editoru
  if ($('textarea#editor', kontext).length) {
    if ($('textarea#editor', kontext).hasClass('light'))
      var editor = new EditorLight('editor');
    else
      var editor = new Editor('editor');
  }

  // vytvoreni bubliny u chybovych elementu formu
  $('input[title],textarea[title],select[title]', kontext).each(function(index,element) {
    var $element = $(element),
        elem = ($element.parent('span').children('br').length? $element.parent('span').children('br').prev() : $element.parent('span')),
        elemPoz = elem.position();

    var elemDiv = $('<div class="vykricnik"></div>').appendTo($element.parent());
    elemDiv.css('left',(elem.width() + elemPoz.left + 4))
           .css('top',(elemPoz.top + 4));

    var elemDivBubl = $('<div class="bublina"><div class="bublina_horni"></div><div class="bublina_stredni">' + $element.attr('title') + '</div><div class="bublina_dolni"></div></div>').appendTo($element.parent());
    elemDivBubl.css('left',(elem.width() + elemPoz.left + elemDiv.width()))
               .css('top',(elemPoz.top - elemDivBubl.height() + 10));
    element.removeAttribute("title");

    $element.click(function() {
      var $this = $(this);
      if (!$this.data('clicked')) {
        $this.mouseover(function() {
          $(this).parent().children('div.bublina').css('display','');
        });
        $this.mouseout(function() {
          $(this).parent().children('div.bublina').css('display','none');
        });
        $this.data('clicked', 1);
      }
    });
  });

  // vypozicovani nabidky strankovani
  var naStrankuDiv = $('.nastranku', kontext);
  if (naStrankuDiv.length) {
    var tdElem = naStrankuDiv.parent('td');
    naStrankuDiv.css('left',(tdElem.position().left + tdElem.innerWidth() - naStrankuDiv.width() - 1) + 'px');
    naStrankuDiv.css('display','block');
  }

  // vypozicovani listy razeni
  var nadpisVypis = $('.nadpis', kontext).next('div').children('.vypis_bez')
  if (nadpisVypis.length) {
    nadpisVypis.parent('div').prev('.nadpis').css('margin-bottom','0px').css('padding-bottom','0px');
  }

  // obrazky a odkazy
  nactiObsahEditoru(kontext);

  // vertikalni vypozicovani
  $('.jBottom', kontext).each(function(index,element) {
    var elemBottom = $(element);
    elemBottom.css('position','relative')
              .css('top',(elemBottom.parent().height() - elemBottom.height()) + 'px');
  });

  // pole pro datumy
  if ($('.datum', kontext).length || $('.datumod', kontext).length || $('.datumcas', kontext).length) {
    $.getScript(doplnUrl('Soubor','datepicker',{}),function() {
      $('.datum', kontext).datepicker();
      $('.datumod', kontext).datepicker({minDate: '-60D'});
      $('.datumcas', kontext).datetimepicker();
    });
  }

  // nahrad tohle
  $('.nahrad', kontext).each(function(index,element) {
    var elem = $('.tohle_' + $(element).attr('id').substr(7));
    $(element).css('position','absolute')
              .css('top',elem.position().top)
              .css('left',elem.position().left - $(element).width());
  });

  // povinne polozky
  $('.povinne', kontext).attr('title',doplnText('povinne'));

  // overeni adresy
  $('.adresa', kontext).each(function(index,element) {
    if (!$(this).parent().children('.bublina').length) {
      overAdresu($(this),0);
    }
  });

  // adresa clanku
  if ($('#adresa', kontext).length && $('#nazev', kontext).length) {
    $('#nazev', kontext).keyup(function() {
      $('#adresa', kontext).val(vytvorAdresu($('#nazev', kontext).val(),50));
      overAdresu($('#adresa', kontext),1);
    });
  }

  // color picker
  $('.cpicker', kontext).each(function () {
    var $this = $(this),
        $div = $('<div></div>');
    $this.after($div);
    $div.css('float', 'left')
        .css('background', '#'+($this.val() ? $this.val() : '000000'))
        .css('border', '1px solid #000')
        .outerHeight($this.outerHeight())
        .outerWidth($this.outerHeight())
        .css('margin-left', -1 * $this.outerHeight());

    $this.ColorPicker({
      onBeforeShow: function () {
        $this.ColorPickerSetColor($this.val());
      },
      livePreview: true,
      onChange: function (hsb, hex, rgb) {
        $this.val(hex);
        $this.next().css('background', '#'+hex);
      }
    }).bind('keyup', function(){
      $this.ColorPickerSetColor(this.value);
      $this.next().css('background', '#'+this.value);
    });
  });

  // automaticke nacitani fora
  if ($('#forumRefresh', kontext).length) {
    forumInterval = window.setInterval(function() { nactiForum(); }, 60000);
  }

  // overeni existence ip
  if ($('#ipExistuje', kontext).length) {
    var ajaxExistuje = null,
        timeoutExistuje = null,
        $input = $('input#ip', kontext);
    $input.data('hodnota', $input.val()).keyup(function() {
      if (timeoutExistuje) {
        window.clearTimeout(timeoutExistuje);
        timeoutExistuje = null;
      }

      timeoutExistuje = window.setTimeout(function() {
        if ($input.data('hodnota') != $input.val()) {
          $input.data('hodnota', $input.val());
          $.get(doplnUrl('Strom','existujeIp',{'ip' : $('input#ip').val()}), function(data) {
            var arr = urciVysledekFormu(data,'|',2);
            $('#ipExistuje').html(arr[1]);
          });
        }
      }, 500);
    });
  }


  // galerie
  $('a.lightbox', kontext).lightBox({
    txtZpet: 'Předchozí obrázek',
    txtVpred: 'Další obrázek',
    txtZpetOdk: '&laquo; Předchozí',
    txtVpredOdk: 'Další &raquo;',
    txtZavrit: 'Zavřít',
    txtZobrazit: '(Zobrazit v plné velikosti)'
  });

}



































// nacteni novych zaznamu fora
function nactiForum() {
  var $forumRefresh = $('#forumRefresh');
  if ($forumRefresh.length) {
    $forumRefresh.data('text', $forumRefresh.text());
    $.ajax({
      data : 'ajax=1',
      beforeSend : function() {
        $forumRefresh.removeClass('aktualizovat').addClass('aktualizuji').html(doplnText('forum_aktualizuji'));
        window.clearInterval(forumInterval);
      },
      complete : function() {
        if (forumPokracovat) {
          $forumRefresh.removeClass('aktualizuji').addClass('aktualizovat').html( $forumRefresh.data('text') );
          forumInterval = window.setInterval(function() { nactiForum(); }, 60000);
        }
      },
      success : function(data) {
        var $data = $(data),
            slice = $('#vypis').find('tr.lichyRadek, tr.sudyRadek').length;
        $('#vypis .zapati').before($data.find('#vypis tr.lichyRadek, #vypis tr.sudyRadek').slice(slice));
        $('.divOdpovida').replaceWith($data.find('.divOdpovida'));

        if (!$data.find('#forumRefresh').length) {
          $forumRefresh.remove();
          forumPokracovat = false;
        }
      }
    });
  }
}

// vyber kategorie v administraci clanku
function vyberKategorii(elem,vnoreni) {
  if (!elem.hasClass('cbox')) return;
  if (!vnoreni) {
    elem.parent('span').find('.cbox').attr('checked',elem.attr('checked'));
  }
  if (!elem.parent('span').parent('span').find('span .cbox:checked').length) {
    elem.parent('span').parent('span').find('.cbox').attr('checked','');
    vyberKategorii(elem.parent('span').parent('span').children('.cbox'),true);
  }
  if (elem.parent('span').parent('span').find('span .cbox:checked').length) {
    elem.parent('span').parent('span').children('.cbox').attr('checked','checked');
    vyberKategorii(elem.parent('span').parent('span').children('.cbox'),true);
  }
}

function nactiObsahEditoru(kontext) {
  // obrazky
  $('div#editor img', kontext).each(function(index,element) {
    if (arrShoda = $(element).attr('src').match(new RegExp('media/([0-9]+)/1'))) {
      //$('<a class="lightbox" href="media/' + arrShoda[1] + '"' + ($(element).attr('alt')? 'title="' + $(element).attr('alt') + '"' : '') + '></a>').appendTo($(element).parent()).append($(element).detach());
      $(element).wrap($('<a class="lightbox" href="media/' + arrShoda[1] + '"' + ($(element).attr('alt')? 'title="' + $(element).attr('alt') + '"' : '') + '></a>'));
    }
  });
  // odkazy
  $('div#editor a', kontext).each(function(index,element) {
    if (arrShoda = $(element).attr('href').match(new RegExp('file/([0-9]+)/1'))) {
      $(element).addClass('lightbox').attr("href", "media/" + arrShoda[1])
    }
  });

  $('div#editor a.lightbox', kontext).lightBox({
    txtZpet: 'Předchozí obrázek',
    txtVpred: 'Další obrázek',
    txtZpetOdk: '&laquo; Předchozí',
    txtVpredOdk: 'Další &raquo;',
    txtZavrit: 'Zavřít',
    txtZobrazit: '(Zobrazit v plné velikosti)'
  });
}

function pridejBanner(url) {
  var arrUrl = url.split('/',2);

  $.post(doplnUrl('Strom','pridejBanner',{id: arrUrl[1]}),function(data) {
    var arrData = urciVysledekFormu(data,'|',2);
    console.log(arrData);
    if (arrData[0] != 0) {
      $('#banner_div').html(data.substr(arrData[0].length + 1));
      $('#banner').val(arrData[0]);
      $('#novyBanner').val('1');
    }
  });
}

function odeberBanner() {
  $('.banner_odstran').remove();
  $('#banner').val('');
  $('#novyBanner').val('1');
}

function pridejLogo(url) {
  var arrUrl = url.split('/',2);

  $.post(doplnUrl('Strom','pridejLogo',{id: arrUrl[1]}),function(data) {
    var arrData = urciVysledekFormu(data,'|',2);
    if (arrData[0] != 0) {
      $('#logo_div').html(data.substr(arrData[0].length + 1));
      $('#idLogo').val(arrData[0]);
    }
  });
}

function odeberLogo() {
  $('.logo_odstran').remove();
  $('#idLogo').val('');
}

function pridejObrazek(url) {
  var arrUrl = url.split('/',2);

  $.post(doplnUrl('Strom','pridejObrazek',{id: arrUrl[1]}),function(data) {
    var arrData = urciVysledekFormu(data,'|',2);
    if (arrData[0] != 0) {
      $('#obrazek_div').html(data.substr(arrData[0].length + 1));
      $('#obrazek').val(arrData[0]);
      $('#novyObrazek').val('1');
    }
  });
}

function odeberObrazek() {
  $('.obrazek_odstran').remove();
  $('#obrazek').val('');
  $('#novyObrazek').val('1');
}

function overAdresu(elem,timeout) {
  if (typeof(timeout) != 'undefined' && timeout) {
    if (elem.data('timeout')) {
      clearTimeout(elem.data('timeout'));
    }
    elem.data('timeout',setTimeout(function(){overAdresu(elem)},200));
    return;
  }

  if (elem.val() || typeof(timeout) == 'undefined') {
    if ((elem.attr('id') == 'adresa' || elem.attr('id') == 'adresaUzivatel') && $('#' + elem.attr('id') + 'Span').length) {
      $('#' + elem.attr('id') + 'Span').html(elem.val());
      $('#' + elem.attr('id') + 'KurzSpan').html(elem.val());
    }
    $('#adresaDialog .chyba').html('');
    elem.parent().find('img').remove();
    elem.parent().find('.vykricnik').remove();
    elem.parent().find('.bublina').remove();

    $.post(doplnUrl('Strom','adresa',{id: (doplnText('id_clanek')? doplnText('id_clanek') : 0),cas: (new Date().getTime())}),{adresa: elem.val()},function(data) {
      var arrData = urciVysledekFormu(data,'|',2);
      var elemImg = $('<img style="vertical-align:-3px;" src="https://www.gjwprostejov.cz/obrazky/' + (arrData[0] != 0? 'form_ok' : 'form_ko') + '.png" alt=""/>').insertAfter(elem);

      if (arrData[0] == 0) {
        var elemDiv = $('<div class="bublina"><div class="bublina_horni"></div><div class="bublina_stredni">' + arrData[1] + '</div><div class="bublina_dolni"></div></div>').insertAfter(elemImg);
        elemDiv.css('left',(elemImg.position().left + 11));
        elemDiv.css('top',(elem.position().top - elemDiv.height() + 14));
      }
    });
  }
}

function overTimeout() {
  $.get(doplnUrl('Strom','timeout',{}),function(data) {
    var cas = parseInt(data);
    if (!isNaN(cas)) {
      if (cas <= 125) {
        if (cas <= 1) {
          $('#timeoutDialog').dialog('close');
          $('#odhlasenDialog').dialog('open');
        }
        else {
          setTimeout(overTimeout,cas*1000);
          if (!$('#timeoutDialog').data('otevren')) {
            $('#timeoutDialog').data('otevren',1);
            $('#timeoutDialog span').html(parseInt(cas/60) + ':' + (cas%60 < 10? '0' : '') + cas%60);
            $('#timeoutDialog').data('interval',setInterval(function() {
              var arrCas = $('#timeoutDialog span').html().split(':');
              var minuty = parseInt(arrCas[0]);
              var sekundy = (arrCas[1][0] == '0'? parseInt(arrCas[1][1]) : parseInt(arrCas[1]));
              if (!isNaN(minuty) && !isNaN(sekundy) && (minuty || sekundy)) {
                if (sekundy) {
                  sekundy--;
                }
                else {
                  minuty--;
                  sekundy = 59;
                }
                $('#timeoutDialog span').html(minuty + ':' + (sekundy < 10? '0' : '') + sekundy);
              }
            },1000));
            $('#timeoutDialog').dialog('open');
          }
        }
      }
      else {
        $('#timeoutDialog').dialog('close');
        setTimeout(overTimeout,(cas-124)*1000);
      }
    }
  });
}






////////////////////////////////////////////////////////////////////////////////
// TinyMCE Editory

function EditorLight(id) {
  var parametry = doplnZaklad();
  $.getScript('https://www.gjwprostejov.cz/tinymce/jquery.tinymce.js',function() {
    $.getScript('https://www.gjwprostejov.cz/tinymce/plugins/tinybrowser/tb_tinymce.js.php' + parametry,function() {
      $('#editor').data('cas',new Date().getTime());
      $('#editor').tinymce({
        script_url : 'https://www.gjwprostejov.cz/tinymce/tiny_mce.js',
        theme : "advanced",
        plugins : "advlink,advlist,autolink",
        theme_advanced_buttons1 : "undo,redo,|,bold,italic,underline,strikethrough,sub,sup,|,forecolor,backcolor,removeformat,|,bullist,numlist,|,link,unlink,charmap",
        theme_advanced_buttons2 : "",
        theme_advanced_buttons3 : "",
        theme_advanced_toolbar_location : "top",
        theme_advanced_toolbar_align : "left",
        theme_advanced_statusbar_location : "bottom",
        theme_advanced_resizing : true,
        skin : "cirkuit",
        width: 800,
        file_browser_callback : "tinyBrowser",
        handle_event_callback : "editorZmena",
        language : doplnText('jazyk'),
        entity_encoding : "raw"
      });
    });
  });
}

function Editor(id) {
  var parametry = doplnZaklad();
  $.getScript('https://www.gjwprostejov.cz/tinymce/jquery.tinymce.js',function() {
    $.getScript('https://www.gjwprostejov.cz/tinymce/plugins/tinybrowser/tb_tinymce.js.php' + parametry,function() {
      $('#editor').data('cas',new Date().getTime());
      $('#editor').tinymce({
        script_url : 'https://www.gjwprostejov.cz/tinymce/tiny_mce.js',
        theme : "advanced",
        plugins : "advhr,advimage,advlink,advlist,autolink,contextmenu,fullscreen,inlinepopups,layer,media,paste,preview,print,searchreplace,style,table",
        theme_advanced_buttons1 : "formatselect,fontselect,fontsizeselect",
        theme_advanced_buttons2 : "bold,italic,underline,strikethrough,sub,sup,|,justifyleft,justifycenter,justifyright,justifyfull,|,forecolor,backcolor,styleprops,removeformat,|",
        theme_advanced_buttons3 : "undo,redo,|,cut,copy,|,paste,pastetext,pasteword,|,search,|,bullist,numlist,|,outdent,indent,|,hr,advhr,|,link,unlink,anchor,charmap,|,media,image",
        theme_advanced_buttons4 : "tablecontrols,visualaid,|,insertlayer,moveforward,movebackward,absolute,|,print,preview,code,|,fullscreen",
        theme_advanced_toolbar_location : "top",
        theme_advanced_toolbar_align : "left",
        theme_advanced_statusbar_location : "bottom",
        theme_advanced_resizing : true,
        skin : "cirkuit",
        width: 850,
        file_browser_callback : "tinyBrowser",
        handle_event_callback : "editorZmena",
        language : doplnText('jazyk'),
        entity_encoding: 'named',
	      entities: '160,nbsp'
      });
    });
  });

  $('#ulozEditor').click(function(){
    $.post(doplnUrl('Strom','uloz',{id: doplnText('id_clanek')}),$('#editor').serialize(),function(data) {
      var arrData = urciVysledekFormu(data,'|',2);
      if (arrData[0] != 0) {
        $('#editor').val(data.substr(arrData[0].length + arrData[1].length + 2));
      }
      zobrazVysledekFormu(arrData[0],arrData[1]);
    });
  });

  $('#ulozForumEditor').click(function(){
    var $this = $(this);
    $this.attr('disabled', 'disabled').addClass('disabled');
    $.post(doplnUrl('Strom','ulozForum',{id: doplnText('id_forum')}),$('#editor').serialize(),function(data) {
      var arrData = urciVysledekFormu(data,'|',2);
      if (arrData[0] != 0) {
        $('#editor').val(data.substr(arrData[0].length + arrData[1].length + 2));
      }
      zobrazVysledekFormu(arrData[0],arrData[1]);
      $this.removeClass('disabled').removeAttr('disabled');
    });
  });
}

function editorZmena(e) {
  if (e.type == 'keydown') {
    var cas = new Date().getTime();
    if ((cas - $('#editor').data('cas')) > 15000) {
      $('#editor').data('cas',cas);
      $.post(doplnUrl('Strom','timeout',{}));
    }
  }
}
