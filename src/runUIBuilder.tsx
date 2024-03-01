import { bitable, UIBuilder } from "@lark-base-open/js-sdk";

export default async function main(uiBuilder: UIBuilder) {
  uiBuilder.form((form) => ({
    formItems: [
      // form.tableSelect('table', { label: '选择数据表' }),
      // form.viewSelect('view', { label: '选择视图', sourceTable: 'table' }),
      form.textArea('text', { label: '输入文本（目前仅支持单选、日期、普通文本框自动插入）', defaultValue: '产品会议，2 参加会议，营销，中，被动，2月26日 10:30，2月26日 11:00', placeholder: '请使用逗号（中英文均可）隔开每个输入的字段' }),
    ],
    buttons: ['识别', '取消'],
  }), async ({ values }) => {
    const { text } = values;
    const arr = text.split(/[,，]/);
    const trimmedArr = arr.map(value => value.trim());
    let select = new Array(trimmedArr.length).fill(false);
    // console.log(trimmedArr);

    //获取当前所选的信息。 Get the current selection
    const selection = await bitable.base.getSelection();
    //通过tableId获取table数据表。 Find current table by tableId
    const table = await bitable.base.getTableById(selection?.tableId!);
    //获取table数据表的字段列表元信息。Get table's field meta list
    // const fieldMetaList = await table.getFieldMetaList();
    const view = await table.getViewById(selection?.viewId!);
    const fieldMetaList = await view.getVisibleFieldIdList();
    // console.log(fieldMetaList);
    // console.log(viewfieldMetaList);

    const fieldLen = fieldMetaList.length;

    let input = [];
    for (let i = 0; i < fieldLen; i++) {
      // console.log(i);
      // console.log(fieldMetaList[i].type);
      const field = await table.getFieldMetaById(fieldMetaList[i]);
      // console.log(field);
      let flag = false;
      if (field.type == 3) { // 单选
        const singleSelectField = await table.getField<ISingleSelectField>(field.id);
        const options = await field.property.options;
        for (let j = 0; j < options.length && !flag; j++) {
          for (let k = 0; k < trimmedArr.length && !flag; k++) {
            if (options[j].name.includes(trimmedArr[k]) && !select[k]) {
              // console.log(options[j].name);
              const cell = await singleSelectField.createCell(options[j].name);
              input.push(cell);
              select[k] = true;
              flag = true;
            }
          }
        }
      }
      else if (field.type == 5) { //日期 
        const dateTimeField = await table.getField<IDateTimeField>(field.id);
        for (let k = 0; k < trimmedArr.length && !flag; k++) {
          try {
            const dateObj = parseDateString(trimmedArr[k]);
            // console.log(dateObj);
            if (!select[k]) {
              // console.log("enter");
              const cell = await dateTimeField.createCell(dateObj.getTime());
              input.push(cell);
              select[k] = true;
              flag = true;
            }
          } catch (error) {
            // console.error("An error occurred: ", error);
          }
        }

      }
    }

    for (let i = 0; i < fieldLen; i++) {
      const field = await table.getFieldMetaById(fieldMetaList[i]);
      let flag = false;
      if (field.type == 1) { // 文本
        const textField = await table.getField<ITextField>(field.id);
        for (let k = 0; k < trimmedArr.length && !flag; k++) {
          if (!select[k]) {
            const cell = await textField.createCell(trimmedArr[k]);
            input.push(cell);
            select[k] = true;
            flag = true;
          }
        }
      }
    }

    function parseDateString(dateString: string): Date {
      // 假设年份是当前年份
      const year = new Date().getFullYear();

      // 使用正则表达式分解字符串
      const match = dateString.match(/(\d+)月(\d+)日 (\d+):(\d+)/);
      if (!match) {
        throw new Error('Invalid date format');
      }

      // 从匹配项中提取月份、日期、小时和分钟
      const [, month, day, hour, minute] = match.map(Number);

      // 创建一个日期对象。注意月份从0开始，所以需要减去1
      return new Date(year, month - 1, day, hour, minute);
    }


    console.log(input);

    const recordId = await table.addRecord(input);
  });
}
