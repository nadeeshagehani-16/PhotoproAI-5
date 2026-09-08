const express = require('express');
const router = express.Router();
const { getEquipment, getEquipmentById, createEquipment, updateEquipment, deleteEquipment } = require('../controllers/equipmentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getEquipment).post(authorize('Admin', 'Staff'), createEquipment);
router.route('/:id').get(getEquipmentById).put(authorize('Admin', 'Staff'), updateEquipment).delete(authorize('Admin'), deleteEquipment);

module.exports = router;
