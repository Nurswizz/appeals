const { db } = require("../config/db");

const { ObjectId } = require("mongodb");

const APPEAL_STATUSES = {
  NEW: "new",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELED: "canceled",
};
const createAppeal = async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .json({ message: "Title and description are required" });
  }

  try {
    const newAppeal = {
      title,
      description,
      status: APPEAL_STATUSES.NEW,
      createdAt: new Date(),
    };

    const result = await db.collection("appeals").insertOne(newAppeal);

    res.status(201).json({
      message: "Appeal created successfully",
      id: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating appeal:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAppeals = async (req, res) => {
  try {
    const {
      date,
      startDate,
      endDate,
      status,
      limit = 50,
      page = 1,
    } = req.query;
    const query = {};

    if (date && (startDate || endDate)) {
      return res
        .status(400)
        .json({ error: 'Cannot combine "date" with "startDate" or "endDate"' });
    }

    if (date) {
      const targetDate = new Date(date);
      if (isNaN(targetDate)) {
        return res.status(400).json({ error: "Invalid format of date" });
      }
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    if (startDate || endDate) {
      if (!startDate || !endDate) {
        return res.status(400).json({
          error:
            'Both "startDate" and "endDate" are required for range filtering',
        });
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: "Invalid format of date range" });
      }
      if (start > end) {
        return res
          .status(400)
          .json({ error: '"startDate" must be before "endDate"' });
      }
      query.createdAt = { $gte: start, $lte: end };
    }

    if (status) {
      if (!Object.values(APPEAL_STATUSES).includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${Object.values(
            APPEAL_STATUSES
          ).join(", ")}`,
        });
      }
      query.status = status;
    }

    const limitNum = Math.min(parseInt(limit, 10), 100);
    const pageNum = Math.max(parseInt(page, 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const appeals = await db
      .collection("appeals")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const total = await db.collection("appeals").countDocuments(query);

    res.status(200).json({
      appeals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching appeals:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const workOnAppeal = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db
      .collection("appeals")
      .updateOne(
        { _id: ObjectId(id) },
        { $set: { status: APPEAL_STATUSES.IN_PROGRESS, updatedAt: new Date() } }
      );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Appeal not found" });
    }

    res.status(200).json({ message: "Appeal updated successfully" });
  } catch (error) {
    console.error("Error updating appeal:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const completeAppeal = async (req, res) => {
  const { id } = req.params;
  const { solution } = req.body;
  if (!solution) {
    return res.status(400).json({ message: "Solution is required" });
  }
  try {
    const result = await db
      .collection("appeals")
      .updateOne(
        { _id: ObjectId(id) },
        { $set: { status: APPEAL_STATUSES.COMPLETED, updatedAt: new Date() } },
        { $push: { solution } }
      );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Appeal not found" });
    }

    res.status(200).json({ message: "Appeal updated successfully" });
  } catch (error) {
    console.error("Error updating appeal:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const cancelAppeal = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ message: "Reason is required" });
  }
  try {
    const result = await db
      .collection("appeals")
      .updateOne(
        { _id: ObjectId(id) },
        { $set: { status: APPEAL_STATUSES.CANCELED, updatedAt: new Date() } },
        { $push: { reason } }
      );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Appeal not found" });
    }

    res.status(200).json({ message: "Appeal updated successfully" });
  } catch (error) {
    console.error("Error updating appeal:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const cancelAllAppealsWithInProgressStatus = async (req, res) => {
  try {
    const result = await db
      .collection("appeals")
      .updateMany(
        { status: APPEAL_STATUSES.IN_PROGRESS },
        { $set: { status: APPEAL_STATUSES.CANCELED, updatedAt: new Date() } }
      );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: "No appeals found with in-progress status" });
    }

    res
      .status(200)
      .json({ message: "All in-progress appeals updated successfully" });
  } catch (error) {
    console.error("Error updating appeals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createAppeal,
  getAppeals,
  workOnAppeal,
  completeAppeal,
  cancelAppeal,
  cancelAllAppealsWithInProgressStatus,
};
