const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(authorize('Admin'), getUsers).post(authorize('Admin'), createUser);
router.route('/:id').get(authorize('Admin'), getUser).put(authorize('Admin'), updateUser).delete(authorize('Admin'), deleteUser);

module.exports = router;
