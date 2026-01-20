<?php
/**
 * Home/Index Page - Redirects to Dashboard or Login
 */
require_once 'config/database.php';
require_once 'config/constants.php';
require_once 'config/session.php';

if (isLoggedIn()) {
    header('Location: ' . BASE_URL . 'dashboard.php');
} else {
    header('Location: ' . BASE_URL . 'login.php');
}
exit;
?>
