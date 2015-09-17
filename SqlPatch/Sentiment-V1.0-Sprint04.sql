  ALTER TABLE `b_emergency_plan`   
  CHANGE `state` `is_deleted` TINYINT(4) DEFAULT 0  NULL  COMMENT '�Ƿ���ɾ��';

  ALTER TABLE `b_brand_evaluation`   
  CHANGE `id_pk` `id` BIGINT(20) NOT NULL  COMMENT 'staging��ı�Id';

  ALTER TABLE `b_sina_weibo_evaluation`   
  CHANGE `id_pk` `id` BIGINT(20) NOT NULL  COMMENT 'staging��ı�Id'

  ALTER TABLE `b_news_evaluation`   
  CHANGE `updated_by` `updated_by` VARCHAR(38) CHARSET utf8 COLLATE utf8_general_ci NULL  COMMENT '�޸���',
  CHANGE `handle_user` `handle_user` VARCHAR(38) CHARSET utf8 COLLATE utf8_general_ci NULL  COMMENT '������';

  ALTER TABLE `b_news_evaluation_en`   
  CHANGE `updated_by` `updated_by` VARCHAR(38) CHARSET utf8 COLLATE utf8_general_ci NULL  COMMENT '�޸���',
  CHANGE `handle_user` `handle_user` VARCHAR(38) CHARSET utf8 COLLATE utf8_general_ci NULL  COMMENT '������';

  ALTER TABLE `b_sina_weibo_evaluation`   
  CHANGE `updated_by` `updated_by` VARCHAR(38) CHARSET utf8mb4 COLLATE utf8mb4_bin NULL  COMMENT '�޸���',
  CHANGE `handle_user` `handle_user` VARCHAR(38) CHARSET utf8mb4 COLLATE utf8mb4_bin NULL  COMMENT '������';

  ALTER TABLE `b_emergency_plan`   
  ADD COLUMN `customer_name` VARCHAR(255) NULL  COMMENT '�ͻ�����' AFTER `polarity`,
  ADD COLUMN `field_name` VARCHAR(32) NULL  COMMENT '��ҵ��������' AFTER `customer_name`,
  ADD COLUMN `brand_name` VARCHAR(32) NULL  COMMENT 'Ʒ������' AFTER `field_name`;

