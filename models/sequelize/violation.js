'use strict';

module.exports = function(db, DataTypes) {
  var violation = db.define('violation', {
      id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: false
    },
      violation: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
      cost: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      unique: false
    },
  }, {
    tableName: 'violations',
    timestamps: true,
    classMethods: {
      associate: function(models) {
        violation.belongsTo(models.User);
      }
    }
  });

  return violation;
};