-- ͨ��ƽ̨�ͱ����û�ӳ���
CREATE TABLE `saas_user_mapping` (
  `saas_userid` varchar(32) COLLATE utf8_bin DEFAULT NULL COMMENT '��ҵ�ͻ�ID���ԱID',
  `saas_username` varchar(100) COLLATE utf8_bin DEFAULT NULL COMMENT '��Ա��¼��',
  `local_userid` varchar(38) COLLATE utf8_bin DEFAULT NULL COMMENT '�����û�ID',
  `local_username` varchar(255) COLLATE utf8_bin DEFAULT NULL COMMENT '�����û���¼��'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='ͨ��ƽ̨�ͱ����û�ӳ���';

-- ͨ��ƽ̨��ҵ�ͻ���Ա��Ϣͬ����
CREATE TABLE `saas_sync_memberInfo` (
  `ID` varchar(32) COLLATE utf8_bin DEFAULT NULL COMMENT '��ԱID',  
  `EcId` varchar(32) COLLATE utf8_bin DEFAULT NULL COMMENT 'ͨ��ƽ̨��ҵ�û�id',
  `OPType` varchar(45) COLLATE utf8_bin DEFAULT NULL COMMENT '������־01:����02:�޸�03:ɾ��',
  `UserName` varchar(45) COLLATE utf8_bin DEFAULT NULL COMMENT '��Ա��¼��',
  `Phone` varchar(45) COLLATE utf8_bin DEFAULT NULL COMMENT '��Ա�ֻ���',
  `Email` varchar(100) COLLATE utf8_bin DEFAULT NULL COMMENT '��ԱEmail',
  `FaxNum` varchar(100) COLLATE utf8_bin DEFAULT NULL COMMENT '��Ա����',
  `Addr` varchar(255) COLLATE utf8_bin DEFAULT NULL COMMENT '��Ա��ַ',
  `GroupID` varchar(32) COLLATE utf8_bin DEFAULT NULL COMMENT '��ԱȺ��ID',
  `OprTime` datetime DEFAULT NULL COMMENT '����ʱ��',
  `Name` varchar(100) COLLATE utf8_bin DEFAULT NULL COMMENT '��Ա����'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='ͨ��ƽ̨�ͱ����û�ӳ���';

