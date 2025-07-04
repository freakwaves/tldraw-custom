<?php
// CORS headers for tldraw application
header('Access-Control-Allow-Origin: https://your-tldraw-api.onrender.com');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Access-Control-Max-Age: 86400');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Continue with normal request
?> 