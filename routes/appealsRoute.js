const express = require('express');
const router = express.Router();
const appealsController = require('../controllers/appealsController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Appeal:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - status
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the appeal
 *         title:
 *           type: string
 *           description: The title of the appeal
 *         description:
 *           type: string
 *           description: The description of the appeal
 *         status:
 *           type: string
 *           enum: [new, in-progress, completed, canceled]
 *           description: The current status of the appeal
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the appeal was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the appeal was last updated
 *         solutions:
 *           type: array
 *           items:
 *             type: string
 *           description: List of solutions provided for completed appeals
 *         reasons:
 *           type: array
 *           items:
 *             type: string
 *           description: List of cancellation reasons for canceled appeals
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the appeal was completed
 *         canceledAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the appeal was canceled
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *         error:
 *           type: string
 *           description: Detailed error description
 */

router.use(express.json());

/**
 * @swagger
 * /appeals:
 *   post:
 *     summary: Create a new appeal
 *     tags: [Appeals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the appeal
 *               description:
 *                 type: string
 *                 description: The description of the appeal
 *             example:
 *               title: "Test Appeal"
 *               description: "Test Description"
 *     responses:
 *       201:
 *         description: Appeal created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 id:
 *                   type: string
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/appeals', appealsController.createAppeal);

/**
 * @swagger
 * /appeals:
 *   get:
 *     summary: Get a list of appeals with optional filtering
 *     tags: [Appeals]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter appeals by a specific date (e.g., 2025-05-17)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for range filtering (requires endDate)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for range filtering (requires startDate)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, in-progress, completed, canceled]
 *         description: Filter appeals by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of appeals per page (max 100)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: List of appeals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appeals:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appeal'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/appeals', appealsController.getAppeals);

/**
 * @swagger
 * /appeals/{id}/in-progress:
 *   patch:
 *     summary: Set an appeal to in-progress status
 *     tags: [Appeals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the appeal
 *     responses:
 *       200:
 *         description: Appeal updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Appeal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/appeals/:id/in-progress', appealsController.workOnAppeal);

/**
 * @swagger
 * /appeals/{id}/complete:
 *   patch:
 *     summary: Complete an appeal with a solution
 *     tags: [Appeals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the appeal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - solution
 *             properties:
 *               solution:
 *                 type: string
 *                 description: The solution to the appeal
 *             example:
 *               solution: "Issue resolved"
 *     responses:
 *       200:
 *         description: Appeal updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input or status transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Appeal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/appeals/:id/complete', appealsController.completeAppeal);

/**
 * @swagger
 * /appeals/{id}/cancel:
 *   patch:
 *     summary: Cancel an appeal with a reason
 *     tags: [Appeals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the appeal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: The reason for cancellation
 *             example:
 *               reason: "Not needed"
 *     responses:
 *       200:
 *         description: Appeal updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input or status transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Appeal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/appeals/:id/cancel', appealsController.cancelAppeal);

/**
 * @swagger
 * /appeals/cancel-all-in-progress:
 *   patch:
 *     summary: Cancel all in-progress appeals
 *     tags: [Appeals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: The reason for cancellation
 *             example:
 *               reason: "Mass cancellation"
 *     responses:
 *       200:
 *         description: In-progress appeals canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No in-progress appeals found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/appeals/cancel-all-in-progress', appealsController.cancelAllAppealsWithInProgressStatus);

module.exports = router;