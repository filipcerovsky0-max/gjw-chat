
function tinyBrowserPopUp(type,feid,param) {
  var cmsURL = "https://www.gjwprostejov.cz/tinymce/plugins/tinybrowser/tinybrowser.php?" + (param? param + '&' : '') + 'type=' + type + '&feid=' + feid;
  var newwindow = window.open(cmsURL,'','height=495,width=785,scrollbars=yes,resizable=yes');
  if (window.focus) {
    newwindow.focus();
  }
  return false;
}
