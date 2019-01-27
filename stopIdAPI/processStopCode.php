<?php
$request = $_SERVER["REQUEST_METHOD"];
if($request == "GET") {
    include_once("getStop.php");
}


?>