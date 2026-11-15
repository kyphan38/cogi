import { describe, expect, it } from "vitest";
import { anyCrisisLanguage, foldVietnamese, hasCrisisLanguage } from "./crisis-safety";

describe("hasCrisisLanguage", () => {
  it("catches clear crisis words in English", () => {
    for (const text of [
      "Sometimes I think about suicide.",
      "I want to die after this.",
      "I thought about killing myself.",
      "I keep hurting myself when I fail.",
      "Maybe they are better off without me.",
      "I just want to end it all.",
    ]) {
      expect(hasCrisisLanguage(text), text).toBe(true);
    }
  });

  it("catches clear crisis words in Vietnamese, with and without accents", () => {
    for (const text of [
      "Tôi thấy mình vô dụng và không muốn sống nữa.",
      "Toi thay minh vo dung va khong muon song nua.",
      "Có lúc tôi chỉ muốn chết cho xong.",
      "Co luc toi chi muon chet.",
      "Tôi đã nghĩ đến chuyện tự tử.",
      "Toi da nghi den tu tu.",
      "Toi tung co y dinh tu tu.",
      "Tôi từng tự làm hại bản thân.",
      "Sống chẳng còn ý nghĩa gì.",
      "Không còn lý do gì để sống.",
      "Em đã rạch tay hôm qua.",
      "TÔI MUỐN TỰ SÁT.",
    ]) {
      expect(hasCrisisLanguage(text), text).toBe(true);
    }
  });

  it("does not flag everyday setbacks", () => {
    for (const text of [
      "My boss criticized my report in front of the team, and I felt embarrassed.",
      "I failed the driving test and I feel stupid.",
      "The deadline is killing me this week.",
    ]) {
      expect(hasCrisisLanguage(text), text).toBe(false);
    }
  });

  it("does not flag everyday Vietnamese that looks close", () => {
    for (const text of [
      "Hôm nay mệt muốn chết, sếp còn bắt làm thêm giờ.",
      "Met muon chet vi deadline.",
      "Xấu hổ muốn chết khi nói sai trước cả lớp.",
      "Mình muốn từ từ tìm hiểu rồi mới quyết định.",
      "Để mình nghĩ từ từ đã.",
      "Muon tu tu tim hieu roi moi quyet dinh.",
      "Tôi không muốn sống ở Hà Nội nữa vì kẹt xe.",
      "Toi khong muon song chung voi bo me chong.",
      "Tôi lỡ cắt tay áo hơi ngắn.",
    ]) {
      expect(hasCrisisLanguage(text), text).toBe(false);
    }
  });
});

describe("foldVietnamese", () => {
  it("removes accents and turns đ into d", () => {
    expect(foldVietnamese("Đừng Nghĩ Đến Chuyện Đó")).toBe("dung nghi den chuyen do");
  });
});

describe("anyCrisisLanguage", () => {
  it("skips empty and missing texts", () => {
    expect(anyCrisisLanguage([undefined, null, "", "  "])).toBe(false);
    expect(anyCrisisLanguage(["I made a mistake.", "khong muon song nua"])).toBe(true);
  });
});
