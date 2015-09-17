-- 通云平台和本地用户映射表
CREATE TABLE `saas_user_mapping` (
  `saas_userid` varchar(32) COLLATE utf8_bin DEFAULT NULL COMMENT '企业客户ID或成员ID',
  `saas_username` varchar(100) COLLATE utf8_bin DEFAULT NULL COMMENT '成员登录名',
  `local_userid` varchar(38) COLLATE utf8_bin DEFAULT NULL COMMENT '本地用户ID',
  `local_username` varchar(255) COLLATE utf8_bin DEFAULT NULL COMMENT '本地用户登录名'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='通云平台和本地用户映射表';

-- 通云平台企业客户成员信息同步表
CREATE TABLE `saas_sync_memberInfo` (
  `ID` varchar(32) COLLATE utf8_bin DEFAULT NULL COMMENT '成员ID',  
  `EcId` varchar(32) COLLATE utf8_bin DEFAULT NULL COMMENT '通云平台企业用户id',
  `OPType` varchar(45) COLLATE utf8_bin DEFAULT NULL COMMENT '操作标志01:新增02:修改03:删除',
  `UserName` varchar(45) COLLATE utf8_bin DEFAULT NULL COMMENT '成员登录名',
  `Phone` varchar(45) COLLATE utf8_bin DEFAULT NULL COMMENT '成员手机号',
  `Email` varchar(100) COLLATE utf8_bin DEFAULT NULL COMMENT '成员Email',
  `FaxNum` varchar(100) COLLATE utf8_bin DEFAULT NULL COMMENT '成员传真',
  `Addr` varchar(255) COLLATE utf8_bin DEFAULT NULL COMMENT '成员地址',
  `GroupID` varchar(32) COLLATE utf8_bin DEFAULT NULL COMMENT '成员群组ID',
  `OprTime` datetime DEFAULT NULL COMMENT '操作时间',
  `Name` varchar(100) COLLATE utf8_bin DEFAULT NULL COMMENT '成员姓名'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='通云平台和本地用户映射表';

