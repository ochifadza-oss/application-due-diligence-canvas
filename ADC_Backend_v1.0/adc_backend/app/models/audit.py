from sqlalchemy import Column, BigInteger, Integer, String, DateTime, JSON, Enum, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class AuditAction(str, enum.Enum):
    create = "CREATE"
    update = "UPDATE"
    delete = "DELETE"
    login = "LOGIN"
    logout = "LOGOUT"
    export = "EXPORT"

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    org_id = Column(Integer, ForeignKey("organisations.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(Enum(AuditAction), nullable=False, index=True)
    table_name = Column(String(60), nullable=False)
    record_id = Column(Integer, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(300), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
