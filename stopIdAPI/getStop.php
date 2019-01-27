<?php
if(isset($_GET["stop_code"]) && preg_match("/^[0-9]{1,6}$/", $_GET["stop_code"])){
    $stop_code = $_GET["stop_code"];
    $foundCode = false;
    $txt_file = file_get_contents("resources/stops.txt");
    $rows = explode("\n", $txt_file);
    array_shift($rows);
    
    foreach($rows as $row => $data)
    {
        
        $row_data = explode(',', "$data");
        //echo $row_data[3];
        
        if($stop_code == @$row_data[1]){
            $foundCode = true;
            http_response_code(200);
            echo @$row_data[3];
        }    
        
    }

    if ( !$foundCode) {
        http_response_code(400);
    }
} else {
    http_response_code(400);
}
?>