<html>
<head>
	<link rel="icon" type="image/x-icon" href="https://i.imgur.com/UyU5bWX.png">
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>barák</title>
	<link rel="stylesheet" type="text/css" href="styles.css">
	<script type="text/javascript" defer src="script.js"></script>
</head>
<body>
	<a href="index.html"><img class="logo" src="https://i.imgur.com/YolvWTO.png"></a>
	<p class="prvni">OFICÁLNY FANKLUB VALOUSKOVE Slovenskej Republiky</p>
	
	<hr class="oddeleni">
<p class="zkouseni1">Královna českého jazyka a výtvarné výchovy (nejlepší předměty na světě fakt že jo)</p>
	<p style="text-align: center;"><a class="zde" href="https://pisekmatysek.9e.cz/valousek-kolousek.html">Odkaz na barčin bankovní účet(penize zadarmo!!)</a></p>
	<hr class="oddeleni">
<h1 id="casinonadpis"> KLIKNI ZDE A POPŘEJ BARČI DO MAILU HEZKÝ DEN </h1>

<form action="" method="post" style="text-align: center;">
<input class="tlacitkocasino" type="submit" value="Popřát hezký den" />
<input type="hidden" name="button_b" value="1" />
</form>

<?php

if(isset($_POST['button_b']))
{

$to      = 'b.valouskova@gjwprostejov.cz'; 

$subject = 'PŘEJEME HEZKÝ DEN';
$message = 'PĚKNÝ DEN PANÍ VALOUŠKOVÁ, OMLOUVÁME SE JESTLI RUŠÍME ALE NĚKDO ZE STUDENSTVA VÁM PRÁVĚ POPŘÁL HEZKÝ DEN!';
$headers = 'From: barcohezkyden@studenstvo.com' . "\r\n" .
    'Reply-To: barcohezkyden@studenstvo.com' . "\r\n" .
    'X-Mailer: PHP/' . phpversion();

mail($to, $subject, $message, $headers);

echo 'Úspěšně jsi Barče popřál hezký den';
}

?>
<html>
    <hr class="oddeleni">
    <p><i>ostatní bude přidáno v budoucnu</i></p>
</html>
