<?php

    require(__DIR__ . "/includes/config.php");

    // numerically indexed array of places
    $places = [];

    $places = query("SELECT * FROM places WHERE ? = place_name order by id", $_GET["geo"]);
    
    // output places as JSON (pretty-printed for debugging convenience)
    header("Content-type: application/json");
    print(json_encode($places, JSON_PRETTY_PRINT));

?>
