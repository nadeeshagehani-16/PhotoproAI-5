const express = require('express');
const router = express.Router();
const { getEquipment, getEquipmentById, createEquipment, updateEquipment, deleteEquipment } = require('../controllers/equipmentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getEquipment).post(createEquipment);
router.route('/:id').get(getEquipmentById).put(updateEquipment).delete(deleteEquipment);

module.exports = router;
