from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.dialects import mysql
from sqlalchemy.sql import func
from app.db.session import Base


class LandingConfig(Base):
    __tablename__ = "landing_config"
    id = Column(Integer, primary_key=True, autoincrement=True)
    app_name = Column(String(200), nullable=True)
    company = Column(JSON, nullable=True)
    links = Column(JSON, nullable=True)
    plans = Column(JSON, nullable=True)
    updated_by_user_id = Column(
        Integer().with_variant(mysql.INTEGER(unsigned=True), "mysql"),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
